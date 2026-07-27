"use client";

import type { CSSProperties } from "react";

export interface ASCIITextProps {
  text?: string;
  className?: string;
  asciiFontSize?: number;
  textFontSize?: number;
  textColor?: string;
  planeBaseHeight?: number;
  enableWaves?: boolean;
}

const GLYPHS: Record<string, string[]> = {
  P: ["████ ", "█   █", "█   █", "████ ", "█    ", "█    ", "█    "],
  S: [" ████", "█    ", "█    ", " ███ ", "    █", "    █", "████ "],
  D: ["████ ", "█   █", "█   █", "█   █", "█   █", "█   █", "████ "],
  E: ["█████", "█    ", "█    ", "████ ", "█    ", "█    ", "█████"],
  V: ["█   █", "█   █", "█   █", "█   █", " █ █ ", " █ █ ", "  █  "],
  "<": ["   ██", "  ██ ", " ██  ", "██   ", " ██  ", "  ██ ", "   ██"],
  "/": ["    █", "   █ ", "   █ ", "  █  ", " █   ", " █   ", "█    "],
  ">": ["██   ", " ██  ", "  ██ ", "   ██", "  ██ ", " ██  ", "██   "],
};

function makeAscii(text: string) {
  const characters = Array.from(text.toUpperCase()).slice(0, 5);
  return Array.from({ length: 7 }, (_, row) =>
    characters
      .map((character) => GLYPHS[character]?.[row] ?? "     ")
      .join("  "),
  ).join("\n");
}

export default function ASCIIText({
  text = "PS",
  className = "",
  asciiFontSize = 7,
  textFontSize = 220,
  textColor = "var(--portfolio-accent)",
  planeBaseHeight = 7,
}: ASCIITextProps) {
  return (
    <pre
      aria-hidden="true"
      className={`ascii-text ${className}`}
      style={
        {
          "--ascii-color": textColor,
          "--ascii-size": `${asciiFontSize}px`,
          "--ascii-scale": Math.max(0.7, textFontSize / 220),
          "--ascii-height": planeBaseHeight,
        } as CSSProperties
      }
    >
      {makeAscii(text)}
    </pre>
  );
}
