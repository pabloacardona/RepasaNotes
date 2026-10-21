"use client";

import { Fragment } from "react";
import { motion, useReducedMotion } from "motion/react";

// Headline whose words rise in one by one. Words in `highlight` get the marker underline.
export function KineticTitle({ text, highlight = [], className }: { text: string; highlight?: string[]; className?: string }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <h1 className={className} aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={i}>
          {/* The space stays outside the clipped box so the line can wrap. */}
          <span aria-hidden className="inline-block overflow-hidden pb-1 align-bottom">
            <motion.span
              className={`inline-block ${highlight.includes(w) ? "highlight" : ""}`}
              initial={reduce ? false : { y: "110%", rotate: 4 }}
              animate={{ y: 0, rotate: 0 }}
              transition={{ type: "spring", stiffness: 140, damping: 18, delay: 0.15 + i * 0.07 }}
            >
              {w}
            </motion.span>
          </span>
          {i < words.length - 1 && " "}
        </Fragment>
      ))}
    </h1>
  );
}
