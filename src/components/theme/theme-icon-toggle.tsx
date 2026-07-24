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
  const { setPreference } = useTheme();

  return (
    <TooltipProvider delayDuration={180}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Switch to dark theme"
            className="group size-9 rounded-lg active:scale-95 dark:hidden"
            onClick={() => setPreference("dark")}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Moon
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Switch to dark theme</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Switch to light theme"
            className="group hidden size-9 rounded-lg active:scale-95 dark:inline-flex"
            onClick={() => setPreference("light")}
            size="icon"
            type="button"
            variant="ghost"
          >
            <Sun
              aria-hidden="true"
              className="size-4 transition-transform duration-200 group-hover:rotate-12 group-hover:scale-110"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">Switch to light theme</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
