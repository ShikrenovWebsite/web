"use client";

import type { CSSProperties, ReactNode } from "react";
import "./Dock.css";

type DockItemBase = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  dividerBefore?: boolean;
};

export type DockItemData =
  | (DockItemBase & {
      kind: "action";
      onClick: () => void;
    })
  | (DockItemBase & {
      kind: "link";
      href: string;
      external?: boolean;
    });

export type DockProps = {
  items: DockItemData[];
  className?: string;
  panelHeight?: number;
  baseItemSize?: number;
  magnification?: number;
  distance?: number;
};

function DockContent({ item }: { item: DockItemData }) {
  return (
    <>
      <span aria-hidden="true" className="dock-icon">
        {item.icon}
      </span>
      <span className="dock-label" role="tooltip">
        {item.label}
      </span>
    </>
  );
}

export default function Dock({
  items,
  className = "",
  panelHeight = 64,
  baseItemSize = 42,
  magnification = 58,
}: DockProps) {
  const style = {
    "--dock-panel-height": `${panelHeight}px`,
    "--dock-item-size": `${baseItemSize}px`,
    "--dock-item-scale": magnification / baseItemSize,
  } as CSSProperties;

  return (
    <div
      aria-label="Portfolio dock"
      className={`dock-panel ${className}`}
      role="toolbar"
      style={style}
    >
      {items.map((item) => {
        const classes = [
          "dock-item",
          item.dividerBefore ? "dock-item--divider-before" : "",
        ]
          .filter(Boolean)
          .join(" ");
        if (item.kind === "link") {
          return (
            <a
              aria-label={item.label}
              className={classes}
              href={item.href}
              key={`${item.label}-${item.href}`}
              rel={item.external ? "noreferrer" : undefined}
              target={item.external ? "_blank" : undefined}
            >
              <DockContent item={item} />
            </a>
          );
        }
        return (
          <button
            aria-current={item.active ? "location" : undefined}
            aria-label={item.label}
            className={classes}
            key={item.label}
            onClick={item.onClick}
            type="button"
          >
            <DockContent item={item} />
          </button>
        );
      })}
    </div>
  );
}
