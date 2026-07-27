import type { PublicSkill } from "./portfolio-types";

export function SkillGroups({ skills }: { skills: PublicSkill[] }) {
  const seen = new Set<string>();
  const groups = Object.entries(
    skills.reduce<Record<string, PublicSkill[]>>((result, skill) => {
      const key = skill.name.trim().toLowerCase();
      if (seen.has(key)) return result;
      seen.add(key);
      const category = skill.category || "Core skills";
      result[category] = [...(result[category] ?? []), skill];
      return result;
    }, {}),
  )
    .map(
      ([category, items]) =>
        [
          category,
          [...items].sort((a, b) => a.name.localeCompare(b.name)),
        ] as const,
    )
    .sort(([a], [b]) => a.localeCompare(b));

  return (
    <div className="skills-matrix">
      {groups.map(([category, items], groupIndex) => (
        <article className="skill-group" key={category}>
          <header>
            <span>{String(groupIndex + 1).padStart(2, "0")}</span>
            <h3 className="public-display">{category}</h3>
            <small>{items.length}</small>
          </header>
          <div>
            {items.map((skill) => (
              <span key={skill.id}>
                <i aria-hidden="true" />
                {skill.name}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}
