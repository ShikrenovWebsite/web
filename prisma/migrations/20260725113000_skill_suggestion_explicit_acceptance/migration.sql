-- Distinguish an explicit owner acceptance from automatic linking to an
-- already-existing canonical skill.
ALTER TABLE "SkillSuggestion"
ADD COLUMN "acceptedAt" TIMESTAMP(3);
