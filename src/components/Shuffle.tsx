"use client";

import {
  type CSSProperties,
  type ElementType,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import "./Shuffle.css";

type ShuffleTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";

export interface ShuffleProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  tag?: ShuffleTag;
  duration?: number;
  triggerOnHover?: boolean;
  threshold?: number;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  shuffleTimes?: number;
  shuffleDirection?: "left" | "right" | "up" | "down";
  animationMode?: "random" | "evenodd";
  ease?: string;
  stagger?: number;
  colorFrom?: string;
  colorTo?: string;
}

const GLYPHS = "01<>/{}[]";

export default function Shuffle({
  text,
  className = "",
  style,
  tag = "span",
  duration = 0.42,
  triggerOnHover = true,
  threshold = 0.2,
  triggerOnce = true,
  respectReducedMotion = true,
  shuffleTimes = 1,
  colorFrom = "var(--portfolio-accent)",
  colorTo = "currentColor",
}: ShuffleProps) {
  const ref = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playedRef = useRef(false);
  const [displayText, setDisplayText] = useState(text);
  const [animating, setAnimating] = useState(false);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setDisplayText(text);
    setAnimating(false);
  }, [text]);

  const play = useCallback(() => {
    if (
      timerRef.current ||
      (respectReducedMotion &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    ) {
      setDisplayText(text);
      return;
    }

    const durationMs = duration <= 10 ? duration * 1000 : duration;
    const startedAt = performance.now();
    setAnimating(true);
    timerRef.current = setInterval(() => {
      const progress = Math.min(
        (performance.now() - startedAt) / durationMs,
        1
      );
      const revealed = Math.floor(text.length * progress);
      setDisplayText(
        Array.from(text)
          .map((character, index) => {
            if (
              character === " " ||
              index < revealed ||
              Math.random() > Math.min(0.9, 0.45 + shuffleTimes * 0.12)
            ) {
              return character;
            }
            return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          })
          .join("")
      );
      if (progress >= 1) stop();
    }, 42);
  }, [duration, respectReducedMotion, shuffleTimes, stop, text]);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!triggerOnce || !playedRef.current)) {
          playedRef.current = triggerOnce;
          play();
          if (triggerOnce) observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" }
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [play, threshold, triggerOnce]);

  const Tag = tag as ElementType;

  return (
    <Tag
      className={`shuffle-parent ${animating ? "is-shuffling" : ""} ${className}`}
      onMouseEnter={triggerOnHover ? play : undefined}
      ref={ref}
      style={
        {
          "--shuffle-color-from": colorFrom,
          "--shuffle-color-to": colorTo,
          ...style,
        } as CSSProperties
      }
    >
      <span aria-hidden="true">{displayText}</span>
      <span className="sr-only">{text}</span>
    </Tag>
  );
}
