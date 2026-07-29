type SkillLike = { id: string; name: string };

const canonicalSkillNames: Record<string, string> = {
  node: "Node.js",
  nodejs: "Node.js",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  nextjs: "Next.js",
  reactjs: "React",
  javascript: "JavaScript",
  typescript: "TypeScript",
  tailwind: "Tailwind CSS",
  tailwindcss: "Tailwind CSS",
  shadcn: "shadcn/ui",
  shadcnui: "shadcn/ui",
};

function skillKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function flattenCvSkills<T extends SkillLike>(skills: readonly T[]) {
  const seen = new Set<string>();
  return skills.flatMap((skill) => {
    const sourceKey = skillKey(skill.name);
    const name = canonicalSkillNames[sourceKey] ?? skill.name.trim();
    const key = skillKey(name);
    if (!key || seen.has(key)) return [];
    seen.add(key);
    return [{ id: skill.id, name }];
  });
}

export function flatCvSkillsText(skills: readonly { name: string }[]) {
  return skills.map((skill) => skill.name).join(" | ");
}
