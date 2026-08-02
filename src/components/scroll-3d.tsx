import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Sets the 3D perspective for a page. Wrap a page's root content in this
 * once, then wrap each major section inside it with <Scroll3DSection>.
 * Intentionally NOT used on the dashboard (index.tsx), which keeps its
 * existing float-in-on-load animation instead.
 */
export function Scroll3DPage({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`scroll-3d-page ${className}`}>
      {children}
    </div>
  );
}

/**
 * Tilts a section up out of 3D depth, fading and settling into place as the
 * user scrolls it into view. Distinct from the dashboard's on-load animation
 * because it is driven by scroll position, not a fixed timer.
 */
export function Scroll3DSection({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 92%", "start 45%"],
  });

  const rotateX = useTransform(scrollYProgress, [0, 1], [14, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [48, 0]);
  const opacity = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const scale = useTransform(scrollYProgress, [0, 1], [0.95, 1]);

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        y,
        opacity,
        scale,
        transformPerspective: 1200,
      }}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
