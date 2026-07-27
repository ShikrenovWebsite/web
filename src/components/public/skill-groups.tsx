import { Code2 } from "lucide-react";
import type { ComponentType } from "react";
import {
  SiAngular,
  SiAnsible,
  SiApollographql,
  SiBootstrap,
  SiCircleci,
  SiCloudflare,
  SiConfluence,
  SiCss,
  SiCypress,
  SiDigitalocean,
  SiDjango,
  SiDocker,
  SiDotnet,
  SiExpress,
  SiFastapi,
  SiFigma,
  SiFirebase,
  SiFlask,
  SiGit,
  SiGithub,
  SiGithubactions,
  SiGo,
  SiGooglecloud,
  SiGraphql,
  SiHtml5,
  SiInsomnia,
  SiJavascript,
  SiJenkins,
  SiJest,
  SiJira,
  SiKubernetes,
  SiLaravel,
  SiMongodb,
  SiMysql,
  SiNestjs,
  SiNetlify,
  SiNextdotjs,
  SiNodedotjs,
  SiNotion,
  SiNpm,
  SiPhp,
  SiPnpm,
  SiPostgresql,
  SiPostman,
  SiPrisma,
  SiPython,
  SiRailway,
  SiReact,
  SiReacthookform,
  SiReactquery,
  SiRedis,
  SiRedux,
  SiRender,
  SiRust,
  SiSass,
  SiShadcnui,
  SiSpringboot,
  SiStorybook,
  SiStrapi,
  SiSupabase,
  SiSvelte,
  SiTailwindcss,
  SiTerraform,
  SiTypescript,
  SiVercel,
  SiVite,
  SiVitest,
  SiVuedotjs,
  SiWebpack,
  SiWordpress,
  SiYarn,
} from "react-icons/si";
import type { PublicSkill } from "./portfolio-types";

type TechnologyIconComponent = ComponentType<{
  "aria-hidden"?: boolean;
  className?: string;
}>;

const technologyIcons: Record<string, TechnologyIconComponent> = {
  angular: SiAngular,
  ansible: SiAnsible,
  apollographql: SiApollographql,
  bootstrap: SiBootstrap,
  circleci: SiCircleci,
  cloudflare: SiCloudflare,
  confluence: SiConfluence,
  css: SiCss,
  css3: SiCss,
  cypress: SiCypress,
  digitalocean: SiDigitalocean,
  django: SiDjango,
  docker: SiDocker,
  dotnet: SiDotnet,
  express: SiExpress,
  expressjs: SiExpress,
  fastapi: SiFastapi,
  figma: SiFigma,
  firebase: SiFirebase,
  flask: SiFlask,
  git: SiGit,
  github: SiGithub,
  githubactions: SiGithubactions,
  go: SiGo,
  golang: SiGo,
  googlecloud: SiGooglecloud,
  graphql: SiGraphql,
  html: SiHtml5,
  html5: SiHtml5,
  insomnia: SiInsomnia,
  javascript: SiJavascript,
  jenkins: SiJenkins,
  jest: SiJest,
  jira: SiJira,
  kubernetes: SiKubernetes,
  laravel: SiLaravel,
  mongodb: SiMongodb,
  mysql: SiMysql,
  nestjs: SiNestjs,
  netlify: SiNetlify,
  nextjs: SiNextdotjs,
  nodejs: SiNodedotjs,
  notion: SiNotion,
  npm: SiNpm,
  php: SiPhp,
  pnpm: SiPnpm,
  postgres: SiPostgresql,
  postgresql: SiPostgresql,
  postman: SiPostman,
  prisma: SiPrisma,
  python: SiPython,
  railway: SiRailway,
  react: SiReact,
  reacthookform: SiReacthookform,
  reactjs: SiReact,
  reactnative: SiReact,
  reactquery: SiReactquery,
  redis: SiRedis,
  redux: SiRedux,
  reduxtoolkit: SiRedux,
  render: SiRender,
  rust: SiRust,
  sass: SiSass,
  scss: SiSass,
  shadcn: SiShadcnui,
  shadcnui: SiShadcnui,
  springboot: SiSpringboot,
  storybook: SiStorybook,
  strapi: SiStrapi,
  supabase: SiSupabase,
  svelte: SiSvelte,
  tailwind: SiTailwindcss,
  tailwindcss: SiTailwindcss,
  terraform: SiTerraform,
  typescript: SiTypescript,
  vercel: SiVercel,
  vite: SiVite,
  vitest: SiVitest,
  vue: SiVuedotjs,
  vuejs: SiVuedotjs,
  webpack: SiWebpack,
  wordpress: SiWordpress,
  yarn: SiYarn,
};

function normalizeTechnologyName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function SkillGroups({ skills }: { skills: PublicSkill[] }) {
  const seen = new Set<string>();
  const technologies = skills
    .filter((skill) => {
      const key = normalizeTechnologyName(skill.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="technology-wall">
      {technologies.map((skill) => {
        const Icon =
          technologyIcons[normalizeTechnologyName(skill.name)] ?? Code2;
        return (
          <div className="technology-item" key={skill.id}>
            <Icon aria-hidden={true} className="technology-icon" />
            <span>{skill.name}</span>
          </div>
        );
      })}
    </div>
  );
}
