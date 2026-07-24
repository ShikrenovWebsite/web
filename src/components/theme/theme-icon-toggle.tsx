"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTheme } from "./theme-provider";

export function ThemeIconToggle() {
  const { resolvedTheme, setPreference } = useTheme();

  if (!resolvedTheme) {
    return (
      <Button
        aria-hidden="true"
        className="size-9 rounded-lg"
        disabled
        size="icon"
        tabIndex={-1}
        type="button"
        variant="ghost"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label={label}
            className="group size-9 rounded-lg active:scale-95"
            onClick={() => setPreference(isDark ? "light" : "dark")}
            size="icon"
            type="button"
            variant="ghost"
          >
            {isDark ? (
              <Sun
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110"
              />
            ) : (
              <Moon
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110"
              />
            )}
          </Button>
        </TooltipTrigger>

        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
