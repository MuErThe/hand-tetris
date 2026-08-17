// Micro-lessons: one-line design principles surfaced in the round reveal,
// chosen to match the mistake the player just made. The reveal is the lesson;
// the score is only the motivation.
//
// Shape: LESSONS[game][type] holds a `_default` list plus per-mistake-tag
// lists. Each value is an array so we can offer light variety and avoid
// repeating the exact same wording twice in one session.

type TagLessons = Record<string, string[]>;
type GameLessons = Record<string, TagLessons>;

const LESSONS: Record<string, GameLessons> = {
  "eyeball-it": {
    bisect: {
      _default: [
        "The midpoint is exactly halfway, and most eyes drift toward the busier end.",
      ],
      over: ["You went past halfway. The true middle is nearer than it looks from the long side."],
      under: ["Short of halfway. The eye tends to stop early on the approach."],
    },
    thirds: {
      _default: [
        "The rule of thirds puts the line a third of the way in, off-centre on purpose.",
      ],
      over: ["Too far in. A third sits nearer the edge than the middle."],
      under: ["Not far enough. A third still stands well clear of the edge."],
    },
    golden: {
      _default: [
        "The golden section lands at 0.618: past a half, short of two-thirds.",
      ],
      over: ["You drifted toward two-thirds; the golden point is a touch tighter."],
      under: ["You leaned toward the half; the golden point sits a little further out."],
    },
    centre: {
      _default: [
        "Dead centre means equal on all four sides, so check the gaps, not the shape.",
      ],
      off: ["Trust the gaps: equal margins beat 'looks about right'."],
    },
    angle: {
      _default: [
        "Judge angles against the horizon and vertical, not the neighbouring line.",
      ],
      steep: ["Steeper than the target. The eye exaggerates angles near vertical."],
      shallow: ["Shallower than the target. Small angles read flatter than they are."],
    },
    "optical-centre": {
      _default: [
        "To look centred, an element sits slightly ABOVE the mathematical middle.",
      ],
      "geometric-trap": ["Geometry lies: the true middle looks low. Nudge up ~2-4%."],
      "over-corrected": ["Eased up too far. Optical centre is only a hair above geometric."],
    },
  },
  "kern-combat": {
    open: {
      _default: ["Open pairs like AV or To overlap, so let the shapes nest under each other."],
      wide: ["Too airy. Diagonals and overhangs should tuck in tighter than they look."],
      tight: ["Nicely nested. Open pairs want to overlap their bounding boxes."],
    },
    round: {
      _default: ["Curves carry their own space, so round-to-round tucks in tight."],
      wide: ["Rounds drifted apart. Curves need less air than flat sides."],
      tight: ["Good, but don't crush the curves; leave the counters breathing."],
    },
    straight: {
      _default: ["Parallel stems need real air. Straight sides read cramped fast."],
      tight: ["Too cramped. Give parallel stems room or they fuse into a wall."],
      wide: ["A hair wide. Straights want air, but keep the rhythm even."],
    },
    mixed: {
      _default: ["Chase an even rhythm: every gap should feel the same weight."],
      wide: ["This gap runs wider than its neighbours, so close it to match."],
      tight: ["This gap is tighter than the rest, so open it to keep the rhythm."],
    },
  },
  cutout: {
    union: {
      _default: ["Union keeps every pixel either shape covered, so the outline is the outer edge of both."],
      missed: ["Union has no holes and no notches. If the result covers everything, nothing was removed."],
      caught: ["Right. Union is the silhouette you'd get by tracing round the outside of both."],
    },
    intersect: {
      _default: ["Intersect keeps only the shared region, so the result is never bigger than the smaller shape."],
      missed: ["The result was smaller than both shapes, and only intersect can do that."],
      caught: ["Yes. If it fits inside both originals, it's the overlap."],
    },
    "subtract-ab": {
      _default: ["Subtract keeps the first shape and removes the second. Order is the whole answer."],
      missed: ["Look at which outline survived: the shape you can still recognise is the one that stayed."],
      caught: ["Exactly. A kept its outline, B became the bite taken out of it."],
    },
    "subtract-ba": {
      _default: ["B minus A is a different shape from A minus B, and the survivor tells you which came first."],
      missed: ["You had the operation right and the order backwards. Check which outline is still intact."],
      caught: ["Good. You read the order off the surviving outline rather than guessing."],
    },
    exclude: {
      _default: ["Exclude keeps both shapes and drops the overlap, so it leaves a hole where they met."],
      missed: ["A hole in the middle with both outlines intact is exclude, because union has no hole."],
      caught: ["Right. Both outlines survive and the shared part is gone."],
    },
  },
  "steady-hand": {
    arc: {
      _default: ["Draw from the shoulder, not the fingers. Long bones make long curves."],
      drift: ["A steady hand on the wrong line is still the wrong line. Check the whole arc before you commit."],
      wobble: ["Speed steadies a curve. Slow tracing amplifies every tremor."],
      short: ["Finish the stroke. An abandoned curve scores what it covered, not what it intended."],
    },
    "s-curve": {
      _default: ["At the inflection the hand has to reverse its bias, so plan the turn before you reach it."],
      drift: ["You held one bias through the whole S. The second half needs the opposite pressure."],
      wobble: ["The wobble concentrates at the inflection: slow the eye there, not the hand."],
      short: ["The turn is the point of an S, so stopping before it skips the exercise."],
    },
    tight: {
      _default: ["Tight radii get cut, not missed. The hand takes the short way round a bend."],
      drift: ["You rode the inside of the bend. Aim wide of where it feels right."],
      wobble: ["Small radii punish speed. Here alone, slow down into the turn."],
      short: ["The bend is where the marks are, so don't stop on the approach."],
    },
    sweep: {
      _default: ["Long shallow curves fail by drift: tiny errors accumulate over distance."],
      drift: ["A consistent lean over a long sweep. Anchor your eye on the far end, not the tip."],
      wobble: ["Over a long line, one continuous motion beats a series of corrections."],
      short: ["Distance is the test. A sweep is only hard once you're committed to it."],
    },
    hook: {
      _default: ["The junction is the exercise: keep the straight straight until the bend actually starts."],
      drift: ["You started bending early, and the curve crept into the straight section."],
      wobble: ["Two motions, not one blur: run the straight, then turn."],
      short: ["You stopped at the transition, which is precisely the part being measured."],
    },
    wave: {
      _default: ["Repeated inflections expose rhythm: even timing beats even pressure."],
      drift: ["The whole wave sat off to one side; you tracked its shape but not its position."],
      wobble: ["Wobble grows across a wave as the hand tires. Shorter, faster passes hold truer."],
      short: ["Every inflection counts, and the later ones are where hands actually fail."],
    },
  },
  "contrast-call": {
    mono: {
      _default: ["Greyscale is the honest case. If the call is hard here, adding colour will only hide it."],
      over: ["You read it as stronger than it is. Mid-greys separate far less than they appear to."],
      under: ["You under-called it. Light greys carry more contrast than they feel like they do."],
    },
    warm: {
      _default: ["Warm hues flatter themselves: yellow and orange read brighter than their luminance."],
      over: ["Warm colours look luminous, so contrast against them feels higher than it measures."],
      under: ["Deep warms carry more weight than expected. Reds measure darker than they read."],
    },
    cool: {
      _default: ["Blues read darker than they measure, so contrast against them is usually better than it feels."],
      over: ["A saturated blue looks heavy, but its luminance is often middling."],
      under: ["Cool light tints are brighter than they seem, so you had more room than you thought."],
    },
    clash: {
      _default: ["Hue difference is not contrast. Two vivid opposites can vibrate and still fail outright."],
      over: ["Vibration is not legibility. Those hues clash loudly at nearly identical luminance."],
      under: ["Even here the luminance gap was real; the noise made it look worse than it measured."],
    },
    threshold: {
      _default: ["4.5:1 is the line for body text. Anywhere near it, use a checker rather than your eye."],
      over: ["You called it a pass. Around the threshold, confidence is exactly what you can't trust."],
      under: ["You called it a fail when it cleared, and being cautious costs contrast you had earned."],
    },
    extreme: {
      _default: ["The scale is compressed at the top: past roughly 12:1 the eye stops discriminating."],
      over: ["At the low end, small luminance gaps look like more separation than they are."],
      under: ["Near-black on white is far above the minimum, and the top of the scale all looks alike."],
    },
  },
  "double-take": {
    alignment: {
      _default: ["Shared edges do the work: things in one column start on one pixel."],
      missed: ["Run your eye down the left edge. A few stray pixels read as sloppy even when nobody can name why."],
      caught: ["Exactly. Edges either align or they don't. There is no 'nearly'."],
    },
    spacing: {
      _default: ["Even rhythm is invisible; uneven rhythm is the only thing you see."],
      missed: ["Measure the gaps rather than feeling them. One loose gap unsettles the whole stack."],
      caught: ["Good. Consistent spacing is the cheapest polish there is."],
    },
    hierarchy: {
      _default: ["Rank needs a decisive step. Two near-equal sizes compete instead of ordering."],
      missed: ["When the label almost matches the heading, neither leads. Make the difference obvious, not polite."],
      caught: ["Right: rank by a clear step, never by a nudge."],
    },
    contrast: {
      _default: ["Body text needs 4.5:1. Grey-on-grey looks refined on your monitor and vanishes on someone else's."],
      missed: ["Faint text is an accessibility failure, not a style. If it drops under 4.5:1 it is broken, however tasteful it looks."],
      caught: ["Caught it. Low-contrast text fails real people long before it fails taste."],
    },
    radius: {
      _default: ["Corner radii belong to a system, and siblings share one value."],
      missed: ["One odd radius reads as a mistake because it is one. Check controls against their neighbours."],
      caught: ["Yes. Matching radii are what make a set look like a set."],
    },
    padding: {
      _default: ["Equal padding on opposite sides, or the container looks like it is sliding."],
      missed: ["Check left against right. Uneven padding tilts a card even when every element inside is fine."],
      caught: ["Good eye. Balanced padding is what 'centred' actually means."],
    },
    placement: {
      _default: ["An icon belongs on the centreline of the text it labels, optically, not by its bounding box."],
      missed: ["Icons sit in boxes with their own whitespace. Line up the mark you can see, not the box around it."],
      caught: ["Yes. A pixel or two off centre is enough to make a label feel unsettled."],
    },
    proximity: {
      _default: ["Things that belong together sit closer together than things that don't. Grouping is spacing doing a job."],
      missed: ["Compare the gap inside the pair against the gap to the next block. If they're similar, the reader has to guess."],
      caught: ["Right. A pair has to be clearly tighter than the space around it or it stops being a pair."],
    },
    consistency: {
      _default: ["Siblings in a set share one size. A set with an odd member reads as a mistake, because it is one."],
      missed: ["Scan across the row rather than at each icon. Size drift only shows against its neighbours."],
      caught: ["Good. One icon off-size undoes the whole set, however careful the rest is."],
    },
  },
  "colour-forge": {
    saturation: {
      over: ["Most eyes over-saturate. Real colours are greyer than they feel."],
      under: ["A touch flat, the rarer miss. Nudge the chroma up to meet it."],
    },
    hue: {
      off: ["Hue errors shout louder than lightness, so lock the hue in first."],
    },
    lightness: {
      over: ["Reads too light. Squint and match the value before the colour."],
      under: ["Reads too dark. Squint; get the value right, then the colour."],
    },
    balanced: {
      _default: ["Close on every axis. Butt the two edges together to catch the last of it."],
    },
  },
};

/**
 * Pick a lesson for a mistake. `seen` is a session-scoped set of already-shown
 * lines; we prefer an unseen one so the same wording doesn't recur twice.
 */
export function pickLesson(
  game: string,
  type: string,
  tag: string,
  seen?: Set<string>,
): string {
  const table = LESSONS[game]?.[type];
  if (!table) return "";
  const candidates = [...(table[tag] ?? []), ...(table._default ?? [])];
  if (candidates.length === 0) return "";
  const fresh = seen ? candidates.find((c) => !seen.has(c)) : undefined;
  const chosen = fresh ?? candidates[0];
  seen?.add(chosen);
  return chosen;
}
