"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type ThemePreference, useTheme } from "./theme-provider";

const modes = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] satisfies Array<{
  value: ThemePreference;
  label: string;
  icon: typeof Sun;
}>;

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const current = modes.find((mode) => mode.value === preference) ?? modes[2];
  const Icon = current.icon;

  return (
    <Select
      onValueChange={(value) => setPreference(value as ThemePreference)}
      value={preference}
    >
      <SelectTrigger
        aria-label="Color theme"
        className={compact ? "h-9 w-10 px-2" : "h-9 w-[7.5rem] gap-2"}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        {compact ? (
          <span className="sr-only">{current.label}</span>
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent align="end">
        {modes.map((mode) => {
          const ModeIcon = mode.icon;
          return (
            <SelectItem key={mode.value} value={mode.value}>
              <span className="flex items-center gap-2">
                <ModeIcon aria-hidden="true" className="size-4" />
                {mode.label}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
