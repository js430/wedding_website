"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

/**
 * Silk curtain page transition — every navigation re-mounts this
 * template, sweeping a crimson silk panel (with a trailing gold layer)
 * off the screen to reveal the new page.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  return (
    <>
      {children}
      {!reduced && (
        <>
          {/* Crimson silk — sheen bands give it the fabric feel */}
          <motion.div
            className="fixed inset-0 z-[92] pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, #1E0008 0%, #6d0210 30%, #a01325 48%, #6d0210 62%, #1E0008 100%)",
            }}
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          />
          {/* Gold lining that trails just behind */}
          <motion.div
            className="fixed inset-0 z-[91] pointer-events-none"
            style={{
              background:
                "linear-gradient(105deg, #7d621c 0%, #c9a838 50%, #7d621c 100%)",
            }}
            initial={{ x: 0 }}
            animate={{ x: "100%" }}
            transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1], delay: 0.1 }}
          />
        </>
      )}
    </>
  );
}
