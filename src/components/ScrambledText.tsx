"use client";

import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import "./ScrambledText.css";

export interface ScrambledTextProps {
  className?: string;
  style?: CSSProperties;
  children: string;
  radius?: number;
  duration?: number;
  speed?: number;
  scrambleChars?: string;
}

export default function ScrambledText({
  className = "",
  style,
  children,
  radius = 90,
  duration = 0.8,
  speed = 0.35,
  scrambleChars = ".:/01",
}: ScrambledTextProps) {
  const restoreRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [value, setValue] = useState(children);

  useEffect(
    () => () => {
      if (restoreRef.current) clearTimeout(restoreRef.current);
    },
    [],
  );

  function handlePointerMove(event: PointerEvent<HTMLParagraphElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const center = Math.round(
      ((event.clientX - rect.left) / Math.max(rect.width, 1)) * children.length,
    );
    const characterRadius = Math.max(
      2,
      Math.round((radius / Math.max(rect.width, 1)) * children.length),
    );
    setValue(
      Array.from(children)
        .map((character, index) => {
          if (
            character === " " ||
            Math.abs(index - center) > characterRadius ||
            Math.random() > 0.42 + speed * 0.25
          ) {
            return character;
          }
          return scrambleChars[
            Math.floor(Math.random() * scrambleChars.length)
          ];
        })
        .join(""),
    );
    if (restoreRef.current) clearTimeout(restoreRef.current);
    restoreRef.current = setTimeout(
      () => setValue(children),
      Math.max(60, duration * 120),
    );
  }

  return (
    <p
      aria-label={children}
      className={`scrambled-text ${className}`}
      onPointerLeave={() => setValue(children)}
      onPointerMove={handlePointerMove}
      style={style}
    >
      <span aria-hidden="true">{value}</span>
    </p>
  );
}
