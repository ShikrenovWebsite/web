export type PublicExperience = {
  id: string;
  company: string;
  role: string;
  meta: string;
  description: string;
  highlights: string[];
};

export type PublicProject = {
  id: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  highlights: string[];
  technologies: string[];
  liveUrl: string;
  sourceCodeUrl: string;
  coverImageUrl: string;
  featured: boolean;
};

export type PublicEducation = {
  id: string;
  institution: string;
  qualification: string;
  fieldOfStudy: string;
  meta: string;
  description: string;
  achievements: string[];
};

export type PublicSkill = {
  id: string;
  name: string;
  category: string;
};

export type PublicSocialLinks = {
  github?: string;
  linkedin?: string;
  website?: string;
  email?: string;
};
