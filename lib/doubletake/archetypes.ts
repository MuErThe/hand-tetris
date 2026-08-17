// The five card kinds, each laid out from the same `Spec`. A layout is a pure
// function from numbers to positioned elements, so a flaw is one number moved
// and the reveal can mark the exact box it moved.
//
// Elements carry roles rather than ids. The engine maps a flaw to a role and
// derives the marker from whatever the layout actually emitted, which also
// means the support matrix is computed from the layouts instead of maintained
// beside them.

import {
  type Archetype,
  type Copy,
  type El,
  type Role,
  type Spec,
  type Tone,
  CARD,
  PANEL_W,
  TONES,
} from "./types";

/**
 * The gap a title/meta pair uses in the flow. The proximity flaw widens
 * `spec.groupGap` past it, but every layout advances by this constant, so the
 * loosened pair does NOT push the rest of the card down: otherwise the round
 * would carry a second tell (everything below shifted) and stop being one flaw.
 */
export const GROUP_GAP = 5;

/** The flawless baseline. Every flaw is a departure from exactly one of these. */
export function baseSpec(): Spec {
  return {
    padL: 18,
    padR: 18,
    padT: 16,
    gap: 12,
    gapDrift: 0,
    driftX: 0,
    titleSize: 15,
    metaSize: 10.5,
    // 0.72 over the card ground clears 4.5:1 comfortably.
    metaAlpha: 0.72,
    leadSize: 10.5,
    leadAlpha: 0.72,
    groupGap: GROUP_GAP,
    radius: 5,
    radiusDrift: 0,
    iconSize: 13,
    iconDrift: 0,
    nudgeY: 0,
  };
}

function tone(c: Copy): Tone {
  return TONES[c.tone % TONES.length];
}

/** What each archetype calls its parts, so the teach-back names real things. */
export interface Nouns {
  title: string;
  meta: string;
  drift: string;
  stack: string;
  iconRow: string;
  nudge: string;
  sib: string;
}

export const NOUNS: Record<Archetype, Nouns> = {
  profile: {
    title: "the name",
    meta: "the role line",
    drift: "the stat row",
    stack: "the button row",
    iconRow: "the stat icons",
    nudge: "the stat icons",
    sib: "the two buttons",
  },
  product: {
    title: "the product name",
    meta: "the variant line",
    drift: "the rating row",
    stack: "the action row",
    iconRow: "the star row",
    nudge: "the stars",
    sib: "the two controls",
  },
  player: {
    title: "the track title",
    meta: "the artist line",
    drift: "the progress row",
    stack: "the transport row",
    iconRow: "the transport icons",
    nudge: "the play glyph",
    sib: "the two controls",
  },
  metric: {
    title: "the metric name",
    meta: "the period line",
    drift: "the sparkline",
    stack: "the footer row",
    iconRow: "the row icons",
    nudge: "the delta arrow",
    sib: "the two chips",
  },
  notify: {
    title: "the headline",
    meta: "the source line",
    drift: "the quoted block",
    stack: "the action row",
    iconRow: "the row icons",
    nudge: "the bell glyph",
    sib: "the two buttons",
  },
};

/* -------------------------------------------------------------------------- */
/* Copy                                                                        */
/* -------------------------------------------------------------------------- */

export const COPY: Record<Archetype, Copy[]> = {
  profile: [
    {
      initials: "AR",
      title: "Amara Reid",
      meta: "Product designer · Lisbon",
      badge: "PRO",
      facts: [
        ["2,481", "followers"],
        ["134", "projects"],
        ["4.9", "rating"],
      ],
      meta2: "Joined March 2024 · 12 shared boards",
      primary: "Follow",
      secondary: "Message",
      tone: 0,
    },
    {
      initials: "KM",
      title: "Kenji Mori",
      meta: "Frontend engineer · Osaka",
      badge: "TEAM",
      facts: [
        ["1,209", "followers"],
        ["87", "repos"],
        ["4.7", "rating"],
      ],
      meta2: "Joined July 2023 · 4 shared boards",
      primary: "Follow",
      secondary: "Message",
      tone: 1,
    },
    {
      initials: "NB",
      title: "Nia Barrett",
      meta: "Research lead · Leeds",
      badge: "PRO",
      facts: [
        ["940", "followers"],
        ["52", "studies"],
        ["5.0", "rating"],
      ],
      meta2: "Joined January 2025 · 9 shared boards",
      primary: "Follow",
      secondary: "Message",
      tone: 3,
    },
  ],
  product: [
    {
      title: "Aperture desk lamp",
      meta: "Matte brass · dimmable",
      value: "£148",
      facts: [["4.6", "218 reviews"]],
      primary: "Add to basket",
      tone: 5,
      motif: "arcs",
    },
    {
      title: "Field notebook set",
      meta: "Three-pack · dot grid",
      value: "£24",
      facts: [["4.8", "1,042 reviews"]],
      primary: "Add to basket",
      tone: 4,
      motif: "grid",
    },
    {
      title: "Terrace lounge chair",
      meta: "Oak frame · flax linen",
      value: "£420",
      facts: [["4.5", "76 reviews"]],
      primary: "Add to basket",
      tone: 1,
      motif: "blocks",
    },
  ],
  player: [
    {
      title: "Slow Weather",
      // Meta lines stay short: the hierarchy flaw grows them to 14.2px, and a
      // line that clipped at that size would be a second tell.
      meta: "Halcyon Field",
      facts: [["up next", "Kestrel · Northbound"]],
      time: "1:24",
      value: "-2:37",
      tone: 3,
      motif: "wave",
    },
    {
      title: "Paper Streets",
      meta: "Ida Vance",
      facts: [["up next", "Marlow · Tin Roof"]],
      time: "0:48",
      value: "-3:05",
      tone: 2,
      motif: "arcs",
    },
    {
      title: "Blue Hour Drive",
      meta: "Kestrel",
      facts: [["up next", "Halcyon Field · Slow Weather"]],
      time: "2:11",
      value: "-1:52",
      tone: 0,
      motif: "blocks",
    },
  ],
  metric: [
    {
      title: "Active users",
      meta: "Rolling 30-day average",
      meta2: "30 DAYS",
      value: "48,290",
      facts: [
        ["+12.4%", ""],
        ["vs previous period", "+5,120"],
      ],
      spark: [0.28, 0.34, 0.3, 0.42, 0.39, 0.5, 0.58, 0.52, 0.64, 0.7, 0.66, 0.78, 0.85, 0.92],
      tone: 0,
    },
    {
      title: "Weekly revenue",
      meta: "Net of refunds",
      meta2: "7 DAYS",
      value: "£31,845",
      facts: [
        ["+6.1%", ""],
        ["vs previous period", "+£1,830"],
      ],
      spark: [0.4, 0.36, 0.48, 0.44, 0.55, 0.5, 0.62, 0.7, 0.65, 0.72, 0.68, 0.8, 0.76, 0.88],
      tone: 4,
    },
    {
      title: "Median response",
      meta: "Business hours only",
      meta2: "14 DAYS",
      value: "3m 12s",
      facts: [
        ["+8.7%", ""],
        ["vs previous period", "−22s"],
      ],
      spark: [0.62, 0.58, 0.66, 0.6, 0.52, 0.56, 0.48, 0.44, 0.5, 0.42, 0.38, 0.44, 0.34, 0.3],
      tone: 1,
    },
  ],
  notify: [
    {
      title: "Deploy finished",
      meta: "squint-web · production",
      meta2: "Build 482 shipped in 3m 12s.",
      facts: [
        ["14 files changed", ""],
        ["Triggered by amara.reid", ""],
      ],
      time: "2m ago",
      primary: "View run",
      secondary: "Dismiss",
      tone: 4,
    },
    {
      title: "Review requested",
      meta: "Ida Vance · pricing copy",
      meta2: "Pricing page copy · second pass.",
      facts: [
        ["4 open comments", ""],
        ["Due Thursday", ""],
      ],
      time: "18m ago",
      primary: "Open draft",
      secondary: "Later",
      tone: 3,
    },
    {
      title: "Storage nearly full",
      meta: "Workspace · design assets",
      meta2: "84% of 2 TB used.",
      facts: [
        ["312 GB remaining", ""],
        ["Growing 9 GB a week", ""],
      ],
      time: "1h ago",
      primary: "Manage plan",
      secondary: "Dismiss",
      tone: 2,
    },
  ],
};

/* -------------------------------------------------------------------------- */
/* Layouts                                                                     */
/* -------------------------------------------------------------------------- */

/** Centre `size` on a box of height `h` starting at `y`, then nudge. */
function centreY(y: number, h: number, size: number, nudge: number): number {
  return y + (h - size) / 2 + nudge;
}

function profile(s: Spec, c: Copy): El[] {
  const t = tone(c);
  const left = s.padL;
  const right = PANEL_W - s.padR;
  const cw = right - left;
  const els: El[] = [];
  const facts = c.facts ?? [];

  // Header: avatar, name, plan badge, role.
  const av = 42;
  let y = s.padT;
  els.push({ kind: "box", x: left, y, w: av, h: av, radius: av / 2, fill: t.soft });
  els.push({
    kind: "text",
    x: left,
    y,
    w: av,
    h: av,
    text: c.initials ?? "",
    size: 15,
    weight: 700,
    colour: t.base,
    align: "center",
  });
  els.push({
    kind: "text",
    x: left + av + 12,
    y: y + 3,
    w: right - (left + av + 12) - 52,
    h: 17,
    text: c.title,
    size: s.titleSize,
    weight: 600,
    roles: ["title"],
  });
  els.push({
    kind: "box",
    x: right - 46,
    y: y + 4,
    w: 46,
    h: 18,
    radius: s.radius,
    fill: t.soft,
  });
  els.push({
    kind: "text",
    x: right - 46,
    y: y + 4,
    w: 46,
    h: 18,
    text: c.badge ?? "",
    size: 8.5,
    weight: 700,
    colour: t.base,
    align: "center",
    mono: true,
  });
  els.push({
    kind: "text",
    x: left + av + 12,
    y: y + 3 + 17 + s.groupGap,
    w: cw - av - 12,
    h: 14,
    text: c.meta,
    size: s.leadSize,
    alpha: s.leadAlpha,
    roles: ["meta"],
  });

  y += av + s.gap;
  els.push({ kind: "box", x: left, y, w: cw, h: 1, fill: CARD.line });

  // Stats: three cells sharing the card's left column with the avatar.
  y += 1 + s.gap;
  const cell = cw / 3;
  const statIcons = ["users", "grid", "star"] as const;
  const valueH = 17;
  facts.slice(0, 3).forEach(([value, label], i) => {
    const size = s.iconSize + (i === facts.length - 1 ? s.iconDrift : 0);
    const cx = left + s.driftX + i * cell;
    els.push({
      kind: "icon",
      icon: statIcons[i],
      x: cx,
      y: centreY(y, valueH, size, s.nudgeY),
      w: size,
      h: size,
      colour: t.base,
      roles: ["drift", "iconRow", "nudge"],
    });
    els.push({
      kind: "text",
      x: cx + s.iconSize + 7,
      y,
      w: cell - s.iconSize - 7,
      h: valueH,
      text: value,
      size: 14.5,
      weight: 600,
      roles: ["drift"],
    });
    els.push({
      kind: "text",
      x: cx,
      y: y + valueH + 3,
      w: cell - 6,
      h: 13,
      text: label,
      size: s.metaSize,
      alpha: s.metaAlpha,
      roles: ["drift"],
    });
  });

  y += valueH + 3 + 13 + s.gap;
  els.push({ kind: "box", x: left, y, w: cw, h: 1, fill: CARD.line, roles: ["stack"] });

  // Actions: the pair that shares one corner value.
  y += 1 + s.gap + s.gapDrift;
  const bw = 78;
  const bh = 32;
  els.push({
    kind: "box",
    x: right - bw * 2 - 8,
    y,
    w: bw,
    h: bh,
    radius: s.radius,
    border: CARD.border,
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "text",
    x: right - bw * 2 - 8,
    y,
    w: bw,
    h: bh,
    text: c.secondary ?? "",
    size: 11.5,
    weight: 500,
    align: "center",
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "box",
    x: right - bw,
    y,
    w: bw,
    h: bh,
    radius: s.radius + s.radiusDrift,
    fill: t.base,
    roles: ["sibB", "stack"],
  });
  els.push({
    kind: "text",
    x: right - bw,
    y,
    w: bw,
    h: bh,
    text: c.primary ?? "",
    size: 11.5,
    weight: 600,
    colour: CARD.ground,
    align: "center",
    roles: ["sibB", "stack"],
  });

  y += bh + s.gap;
  els.push({
    kind: "text",
    x: left,
    y,
    w: cw,
    h: 13,
    text: c.meta2 ?? "",
    size: s.metaSize,
    alpha: s.metaAlpha,
  });

  return els;
}

function product(s: Spec, c: Copy): El[] {
  const t = tone(c);
  const left = s.padL;
  const right = PANEL_W - s.padR;
  const cw = right - left;
  const els: El[] = [];
  const rating = c.facts?.[0] ?? ["", ""];

  // Full-bleed art, so the card reads as a listing rather than a diagram.
  const artH = 80;
  els.push({
    kind: "art",
    x: 0,
    y: 0,
    w: PANEL_W,
    h: artH,
    radius: 0,
    from: t.base,
    to: t.deep,
    motif: c.motif ?? "arcs",
  });

  let y = artH + s.gap;
  els.push({
    kind: "text",
    x: left,
    y,
    w: cw - 76,
    h: 17,
    text: c.title,
    size: s.titleSize,
    weight: 600,
    roles: ["title"],
  });
  els.push({
    kind: "text",
    x: right - 76,
    y,
    w: 76,
    h: 17,
    text: c.value ?? "",
    size: 15.5,
    weight: 700,
    colour: t.base,
    align: "right",
  });
  els.push({
    kind: "text",
    x: left,
    y: y + 17 + s.groupGap,
    w: cw - 76,
    h: 14,
    text: c.meta,
    size: s.leadSize,
    alpha: s.leadAlpha,
    roles: ["meta"],
  });

  // Rating: five siblings on one baseline, sharing the card's left column.
  y += 17 + GROUP_GAP + 14 + s.gap;
  const rowH = 15;
  const step = s.iconSize + 4;
  for (let i = 0; i < 5; i++) {
    // The size drift lands on a lit star: the dimmed fifth reads as a rating,
    // and a flaw hidden in it would be a different question.
    const size = s.iconSize + (i === 3 ? s.iconDrift : 0);
    els.push({
      kind: "icon",
      icon: "star",
      x: left + s.driftX + i * step,
      y: centreY(y, rowH, size, s.nudgeY),
      w: size,
      h: size,
      colour: t.base,
      alpha: i === 4 ? 0.3 : 1,
      roles: ["drift", "iconRow", "nudge", "stack"],
    });
  }
  els.push({
    kind: "text",
    x: left + s.driftX + 5 * step + 8,
    y,
    w: cw - 5 * step - 8,
    h: rowH,
    text: `${rating[0]} · ${rating[1]}`,
    size: s.metaSize,
    alpha: s.metaAlpha,
    roles: ["drift", "stack"],
  });

  // Actions: an icon control and the primary, sharing one corner value.
  y += rowH + s.gap + s.gapDrift;
  const bh = 34;
  els.push({
    kind: "box",
    x: left,
    y,
    w: 42,
    h: bh,
    radius: s.radius,
    border: CARD.border,
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "icon",
    icon: "heart",
    x: left + 21 - (s.iconSize + 1) / 2,
    y: centreY(y, bh, s.iconSize + 1, 0),
    w: s.iconSize + 1,
    h: s.iconSize + 1,
    colour: CARD.ink,
    alpha: 0.55,
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "box",
    x: left + 50,
    y,
    w: right - (left + 50),
    h: bh,
    radius: s.radius + s.radiusDrift,
    fill: t.base,
    roles: ["sibB", "stack"],
  });
  els.push({
    kind: "text",
    x: left + 50,
    y,
    w: right - (left + 50),
    h: bh,
    text: c.primary ?? "",
    size: 11.5,
    weight: 600,
    colour: CARD.ground,
    align: "center",
    roles: ["sibB", "stack"],
  });

  return els;
}

function player(s: Spec, c: Copy): El[] {
  const t = tone(c);
  const left = s.padL;
  const right = PANEL_W - s.padR;
  const cw = right - left;
  const els: El[] = [];
  const next = c.facts?.[0] ?? ["", ""];

  // Header: cover art beside the track's own title/artist pair.
  const cover = 64;
  let y = s.padT;
  els.push({
    kind: "art",
    x: left,
    y,
    w: cover,
    h: cover,
    radius: s.radius + 3,
    from: t.base,
    to: t.deep,
    motif: c.motif ?? "wave",
  });
  const tx = left + cover + 12;
  els.push({
    kind: "text",
    x: tx,
    y: y + 14,
    w: right - tx,
    h: 17,
    text: c.title,
    size: s.titleSize,
    weight: 600,
    roles: ["title"],
  });
  els.push({
    kind: "text",
    x: tx,
    y: y + 14 + 17 + s.groupGap,
    w: right - tx,
    h: 14,
    text: c.meta,
    size: s.leadSize,
    alpha: s.leadAlpha,
    roles: ["meta"],
  });

  // Progress: the whole row shares the card's left column.
  y += cover + s.gap;
  const played = 0.42;
  els.push({
    kind: "box",
    x: left + s.driftX,
    y,
    w: cw,
    h: 4,
    radius: 2,
    fill: CARD.bar,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "box",
    x: left + s.driftX,
    y,
    w: cw * played,
    h: 4,
    radius: 2,
    fill: t.base,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "box",
    x: left + s.driftX + cw * played - 5,
    y: y - 3,
    w: 10,
    h: 10,
    radius: 5,
    fill: t.base,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "text",
    x: left + s.driftX,
    y: y + 11,
    w: 50,
    h: 13,
    text: c.time ?? "",
    size: s.metaSize,
    alpha: s.metaAlpha,
    mono: true,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "text",
    x: right - 50 + s.driftX,
    y: y + 11,
    w: 50,
    h: 13,
    text: c.value ?? "",
    size: s.metaSize,
    alpha: s.metaAlpha,
    align: "right",
    mono: true,
    roles: ["drift", "stack"],
  });

  // Transport: three siblings, with the play glyph centred in its disc.
  y += 4 + 11 + 13 + s.gap + s.gapDrift;
  const disc = 42;
  const mid = PANEL_W / 2;
  els.push({
    kind: "box",
    x: mid - disc / 2,
    y,
    w: disc,
    h: disc,
    radius: disc / 2,
    fill: t.base,
    roles: ["stack"],
  });
  const playSize = s.iconSize + 3;
  els.push({
    kind: "icon",
    icon: "play",
    // +1 optical: a triangle's mass sits left of its bounding box.
    x: mid - playSize / 2 + 1,
    y: centreY(y, disc, playSize, s.nudgeY),
    w: playSize,
    h: playSize,
    colour: CARD.ground,
    roles: ["iconRow", "nudge", "stack"],
  });
  const back = s.iconSize + 1;
  els.push({
    kind: "icon",
    icon: "skipBack",
    x: mid - 43 - back / 2,
    y: centreY(y, disc, back, 0),
    w: back,
    h: back,
    colour: CARD.ink,
    alpha: 0.7,
    roles: ["iconRow", "stack"],
  });
  const fwd = s.iconSize + 1 + s.iconDrift;
  els.push({
    kind: "icon",
    icon: "skipForward",
    x: mid + 43 - fwd / 2,
    y: centreY(y, disc, fwd, 0),
    w: fwd,
    h: fwd,
    colour: CARD.ink,
    alpha: 0.7,
    roles: ["iconRow", "stack"],
  });

  y += disc + s.gap;
  els.push({
    kind: "text",
    x: left,
    y,
    w: 60,
    h: 13,
    text: next[0],
    size: 8.5,
    weight: 600,
    alpha: s.metaAlpha,
    mono: true,
  });
  els.push({
    kind: "text",
    x: left + 60,
    y,
    w: cw - 60,
    h: 13,
    text: next[1],
    size: s.metaSize,
    alpha: s.metaAlpha,
    align: "right",
  });

  return els;
}

function metric(s: Spec, c: Copy): El[] {
  const t = tone(c);
  const left = s.padL;
  const right = PANEL_W - s.padR;
  const cw = right - left;
  const els: El[] = [];
  const delta = c.facts?.[0]?.[0] ?? "";
  const footer = c.facts?.[1] ?? ["", ""];

  let y = s.padT;
  els.push({
    kind: "text",
    x: left,
    y,
    w: cw - 66,
    h: 17,
    text: c.title,
    size: s.titleSize,
    weight: 600,
    roles: ["title"],
  });
  // Period chip: sibling to the delta chip below it.
  els.push({
    kind: "box",
    x: right - 58,
    y: y - 1,
    w: 58,
    h: 20,
    radius: s.radius + s.radiusDrift,
    border: CARD.border,
    roles: ["sibB"],
  });
  els.push({
    kind: "text",
    x: right - 58,
    y: y - 1,
    w: 58,
    h: 20,
    text: c.meta2 ?? "",
    size: 8.5,
    weight: 600,
    alpha: 0.75,
    align: "center",
    mono: true,
    roles: ["sibB"],
  });
  els.push({
    kind: "text",
    x: left,
    y: y + 17 + s.groupGap,
    w: cw - 66,
    h: 14,
    text: c.meta,
    size: s.leadSize,
    alpha: s.leadAlpha,
    roles: ["meta"],
  });

  // The figure, with its delta chip.
  y += 17 + GROUP_GAP + 14 + s.gap;
  const valH = 38;
  els.push({
    kind: "text",
    x: left,
    y,
    w: 160,
    h: valH,
    text: c.value ?? "",
    size: 33,
    weight: 700,
  });
  const chipW = 74;
  const chipH = 22;
  const chipX = right - chipW;
  const chipY = y + (valH - chipH) / 2;
  els.push({
    kind: "box",
    x: chipX,
    y: chipY,
    w: chipW,
    h: chipH,
    radius: s.radius,
    fill: t.soft,
    roles: ["sibA"],
  });
  els.push({
    kind: "icon",
    icon: "arrowUp",
    x: chipX + 9,
    y: centreY(chipY, chipH, s.iconSize, s.nudgeY),
    w: s.iconSize,
    h: s.iconSize,
    colour: t.base,
    roles: ["sibA", "nudge"],
  });
  els.push({
    kind: "text",
    x: chipX + 9 + s.iconSize + 4,
    y: chipY,
    w: chipW - 9 - s.iconSize - 4 - 8,
    h: chipH,
    text: delta,
    size: 11,
    weight: 600,
    colour: t.base,
    roles: ["sibA"],
  });

  // The trend, sharing the card's left column with everything above it.
  y += valH + s.gap;
  els.push({
    kind: "spark",
    x: left + s.driftX,
    y,
    w: cw,
    h: 44,
    points: c.spark ?? [],
    colour: t.base,
    roles: ["drift", "stack"],
  });

  y += 44 + s.gap + s.gapDrift;
  els.push({ kind: "box", x: left, y, w: cw, h: 1, fill: CARD.line, roles: ["stack"] });
  els.push({
    kind: "text",
    x: left,
    y: y + 9,
    w: cw - 80,
    h: 14,
    text: footer[0],
    size: s.metaSize,
    alpha: s.metaAlpha,
    roles: ["stack"],
  });
  els.push({
    kind: "text",
    x: right - 80,
    y: y + 9,
    w: 80,
    h: 14,
    text: footer[1],
    size: 11.5,
    weight: 600,
    align: "right",
    roles: ["stack"],
  });

  return els;
}

function notify(s: Spec, c: Copy): El[] {
  const t = tone(c);
  const left = s.padL;
  const right = PANEL_W - s.padR;
  const cw = right - left;
  const els: El[] = [];
  const lines = c.facts ?? [];

  // Header: a glyph badge, the headline, the source, the timestamp.
  const badge = 44;
  let y = s.padT;
  els.push({
    kind: "box",
    x: left,
    y,
    w: badge,
    h: badge,
    radius: s.radius + 3,
    fill: t.soft,
  });
  const bell = s.iconSize + 4;
  els.push({
    kind: "icon",
    icon: "bell",
    x: left + (badge - bell) / 2,
    y: centreY(y, badge, bell, s.nudgeY),
    w: bell,
    h: bell,
    colour: t.base,
    roles: ["nudge"],
  });
  const tx = left + badge + 12;
  els.push({
    kind: "text",
    x: tx,
    y: y + 2,
    w: right - tx - 52,
    h: 17,
    text: c.title,
    size: s.titleSize,
    weight: 600,
    roles: ["title"],
  });
  els.push({
    kind: "text",
    x: right - 52,
    y: y + 3,
    w: 52,
    h: 14,
    text: c.time ?? "",
    size: s.metaSize,
    alpha: s.metaAlpha,
    align: "right",
  });
  els.push({
    kind: "text",
    x: tx,
    y: y + 2 + 17 + s.groupGap,
    w: right - tx,
    h: 14,
    text: c.meta,
    size: s.leadSize,
    alpha: s.leadAlpha,
    roles: ["meta"],
  });

  // The quoted detail block, sharing the card's left column.
  y += badge + s.gap;
  const qh = 72;
  const qx = left + s.driftX;
  els.push({
    kind: "box",
    x: qx,
    y,
    w: cw,
    h: qh,
    radius: s.radius,
    fill: CARD.fill,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "box",
    x: qx,
    y,
    w: 3,
    h: qh,
    radius: 2,
    fill: t.base,
    roles: ["drift", "stack"],
  });
  els.push({
    kind: "text",
    x: qx + 14,
    y: y + 11,
    w: cw - 28,
    h: 15,
    text: c.meta2 ?? "",
    size: s.metaSize + 0.5,
    alpha: 0.85,
    roles: ["drift", "stack"],
  });
  lines.slice(0, 2).forEach(([line], i) => {
    els.push({
      kind: "text",
      x: qx + 14,
      y: y + 30 + i * 17,
      w: cw - 28,
      h: 14,
      text: line,
      size: s.metaSize,
      alpha: s.metaAlpha,
      roles: ["drift", "stack"],
    });
  });

  // Actions: the pair that shares one corner value.
  y += qh + s.gap + s.gapDrift;
  const bw = 78;
  const bh = 34;
  els.push({
    kind: "box",
    x: right - bw * 2 - 8,
    y,
    w: bw,
    h: bh,
    radius: s.radius,
    border: CARD.border,
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "text",
    x: right - bw * 2 - 8,
    y,
    w: bw,
    h: bh,
    text: c.secondary ?? "",
    size: 11.5,
    weight: 500,
    align: "center",
    roles: ["sibA", "stack"],
  });
  els.push({
    kind: "box",
    x: right - bw,
    y,
    w: bw,
    h: bh,
    radius: s.radius + s.radiusDrift,
    fill: t.base,
    roles: ["sibB", "stack"],
  });
  els.push({
    kind: "text",
    x: right - bw,
    y,
    w: bw,
    h: bh,
    text: c.primary ?? "",
    size: 11.5,
    weight: 600,
    colour: CARD.ground,
    align: "center",
    roles: ["sibB", "stack"],
  });

  return els;
}

const LAYOUTS: Record<Archetype, (s: Spec, c: Copy) => El[]> = {
  profile,
  product,
  player,
  metric,
  notify,
};

export function layout(a: Archetype, s: Spec, c: Copy): El[] {
  return LAYOUTS[a](s, c);
}

/**
 * Which flaws an archetype can host, read off its own layout rather than kept
 * in a table beside it: a card without an icon row cannot be asked a
 * consistency question, and now it cannot claim to be able to either.
 */
export function rolesOf(a: Archetype): Set<Role> {
  const found = new Set<Role>();
  for (const el of layout(a, baseSpec(), COPY[a][0])) {
    for (const r of el.roles ?? []) found.add(r);
  }
  return found;
}
