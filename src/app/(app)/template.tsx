"use client";

import { motion, useReducedMotion } from "motion/react";

// template.tsx se remonta en cada navegación → animación de entrada sin
// necesitar AnimatePresence (sin animaciones de salida: enter-only).
export default function Template({ children }: { children: React.ReactNode }) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
