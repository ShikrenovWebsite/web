"use client";

import { type CSSProperties, useEffect, useMemo, useRef } from "react";
import "./MagnetLines.css";

interface MagnetLinesProps {
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  className?: string;
  style?: CSSProperties;
}

type Point = {
  x: number;
  y: number;
};

export default function MagnetLines({
  rows = 8,
  columns = 16,
  containerSize = "100%",
  lineColor = "var(--portfolio-accent)",
  lineWidth = "2px",
  lineHeight = "1.75rem",
  baseAngle = -12,
  className = "",
  style = {},
}: MagnetLinesProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineCount = rows * columns;
  const lines = useMemo(
    () => Array.from({ length: lineCount }, (_, index) => index),
    [lineCount],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const items = Array.from(
      container.querySelectorAll<HTMLSpanElement>("[data-magnet-line]"),
    );
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let centers: Point[] = [];
    let pointer: Point | null = null;
    let animationFrame = 0;

    const measure = () => {
      centers = items.map((item) => ({
        x: item.offsetLeft + item.offsetWidth / 2,
        y: item.offsetTop + item.offsetHeight / 2,
      }));
    };

    const reset = () => {
      pointer = null;
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      items.forEach((item) => {
        item.style.setProperty("--rotate", `${baseAngle}deg`);
      });
    };

    const render = () => {
      animationFrame = 0;
      const currentPointer = pointer;
      if (!currentPointer || motionQuery.matches) return;

      items.forEach((item, index) => {
        const center = centers[index];
        if (!center) return;
        const angle =
          Math.atan2(currentPointer.y - center.y, currentPointer.x - center.x) *
          (180 / Math.PI);
        item.style.setProperty("--rotate", `${angle + 90}deg`);
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (motionQuery.matches) return;
      const rect = container.getBoundingClientRect();
      pointer = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      if (!animationFrame) animationFrame = requestAnimationFrame(render);
    };

    const handleMotionChange = () => {
      if (motionQuery.matches) reset();
    };

    const resizeObserver = new ResizeObserver(measure);
    measure();
    resizeObserver.observe(container);
    container.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    container.addEventListener("pointerleave", reset);
    motionQuery.addEventListener("change", handleMotionChange);

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", reset);
      motionQuery.removeEventListener("change", handleMotionChange);
    };
  }, [baseAngle, columns, rows]);

  return (
    <div
      aria-hidden="true"
      className={`magnet-lines ${className}`}
      ref={containerRef}
      style={
        {
          "--magnet-columns": columns,
          "--magnet-rows": rows,
          "--magnet-size": containerSize,
          ...style,
        } as CSSProperties
      }
    >
      {lines.map((line) => (
        <span
          data-magnet-line
          key={line}
          style={
            {
              "--rotate": `${baseAngle}deg`,
              backgroundColor: lineColor,
              width: lineWidth,
              height: lineHeight,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
