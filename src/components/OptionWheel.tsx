"use client";

import { type CSSProperties, useRef } from "react";
import "./OptionWheel.css";

export interface OptionWheelProps {
  items: string[];
  selectedIndex?: number;
  onChange?: (index: number, item: string) => void;
  className?: string;
  ariaLabel?: string;
}

export default function OptionWheel({
  items,
  selectedIndex = 0,
  onChange,
  className = "",
  ariaLabel = "Options",
}: OptionWheelProps) {
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function select(index: number) {
    const bounded = (index + items.length) % items.length;
    onChange?.(bounded, items[bounded]);
    itemRefs.current[bounded]?.focus();
  }

  return (
    <div
      aria-label={ariaLabel}
      className={`option-wheel ${className}`}
      role="listbox"
    >
      {items.map((item, index) => {
        const distance = index - selectedIndex;
        return (
          <button
            aria-selected={index === selectedIndex}
            className="option-wheel__item"
            key={item}
            onClick={() => onChange?.(index, item)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                event.preventDefault();
                select(selectedIndex + 1);
              }
              if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                event.preventDefault();
                select(selectedIndex - 1);
              }
              if (event.key === "Home") {
                event.preventDefault();
                select(0);
              }
              if (event.key === "End") {
                event.preventDefault();
                select(items.length - 1);
              }
            }}
            ref={(element) => {
              itemRefs.current[index] = element;
            }}
            role="option"
            style={
              {
                "--ow-distance": distance,
                "--ow-abs-distance": Math.abs(distance),
              } as CSSProperties
            }
            type="button"
          >
            <span className="option-wheel__index">
              {String(index).padStart(2, "0")}
            </span>
            <span>{item}</span>
          </button>
        );
      })}
    </div>
  );
}
