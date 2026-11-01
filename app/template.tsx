"use client";

import { motion, useReducedMotion } from "motion/react";

// Soft fade between pages. Opacity only: a transform here would break position: fixed inside the pages.
export default function Template({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.div initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="flex flex-1 flex-col">
      {children}
    </motion.div>
  );
}
