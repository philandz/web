"use client";

import { useEffect, useRef, useState } from "react";

type StaggeredMountProps = {
  children: React.ReactNode;
  staggerMs?: number;
  defaultDelayMs?: number;
};

export function StaggeredMount({
  children,
  staggerMs = 40,
  defaultDelayMs = 0,
}: StaggeredMountProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    setVisible(true);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const childArray = Array.isArray(children) ? children : [children];

  return (
    <div
      className="transition-all duration-250 ease-out"
      style={{ transitionDelay: `${defaultDelayMs}ms` }}
    >
      {childArray.map((child, index) => (
        <div
          key={index}
          className="transition-all duration-250 ease-out"
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? "translateY(0)" : "translateY(8px)",
            transitionDelay: visible ? `${defaultDelayMs + index * staggerMs}ms` : "0ms",
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}