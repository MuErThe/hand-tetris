"use client";

// Focalism micro-interaction: the detent. Pressing an instrument control
// snaps a notch and settles — a tiny mechanical truth in an optical world.

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { playSfx } from "@/lib/audio/sfx";

interface DetentProps extends HTMLMotionProps<"button"> {
  /** Play the tick cue on press (uses the existing synth "step"). */
  tick?: boolean;
}

export function Detent({ tick = true, onPointerDown, children, ...rest }: DetentProps) {
  const reduced = useReducedMotion();
  return (
    <motion.button
      whileTap={reduced ? undefined : { scale: 0.96 }}
      // Under-damped on purpose: the control dips under the finger and springs
      // back a hair past rest before settling. That overshoot is the whole
      // point of a detent — it reads as a mechanism, not a fade.
      transition={{ type: "spring", stiffness: 520, damping: 13, mass: 0.5 }}
      onPointerDown={(e) => {
        if (tick) playSfx("step");
        onPointerDown?.(e);
      }}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
