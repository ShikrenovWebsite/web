import { Badge } from "@/components/ui/badge";
import type { PublicSkill } from "./portfolio-types";

export function SkillGroups({ skills }: { skills: PublicSkill[] }) {
  const groups = skills.reduce<Record<string, PublicSkill[]>>(
    (result, skill) => {
      const category = skill.category || "Core skills";
      result[category] = [...(result[category] ?? []), skill];
      return result;
    },
    {},
  );

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-x-4 gap-y-3">
      {Object.entries(groups).map(([category, items]) => (
        <div className="grid min-w-0 content-start gap-1.5" key={category}>
          <h3 className="truncate font-mono text-[0.62rem] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            {category}
          </h3>
          <div className="flex flex-wrap gap-1">
            {items.map((skill) => (
              <Badge
                className="rounded-md bg-muted/65 px-1.5 py-0.5 text-[0.68rem] font-normal leading-4 text-foreground"
                key={skill.id}
              >
                {skill.name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
