import type { CvDocumentData } from "@/lib/cv/document";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="cv-section-title mb-3 border-b border-black pb-1 text-sm font-bold uppercase tracking-wide">
      {children}
    </h2>
  );
}

export function CvPreview({ data }: { data: CvDocumentData }) {
  return (
    <article className="cv-sheet mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[16mm] py-[14mm] text-[10pt] leading-[1.4] text-black shadow-sm print:shadow-none">
      <header className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">
          {data.profile.fullName || "Curriculum Vitae"}
        </h1>
        {data.version.headline ? (
          <p className="mt-1 text-base">{data.version.headline}</p>
        ) : null}
        <p className="mt-2 text-sm">
          {[
            data.profile.email,
            data.profile.phone,
            data.profile.location,
            data.profile.website,
            ...data.profile.links,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {data.version.summary ? (
          <p className="mt-4 whitespace-pre-line">{data.version.summary}</p>
        ) : null}
      </header>

      {data.version.sectionOrder.map((section) => {
        if (section === "experience" && data.experience.length) {
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Experience</SectionTitle>
              <div className="space-y-4">
                {data.experience.map((item) => (
                  <div className="cv-item break-inside-avoid" key={item.id}>
                    <div className="flex justify-between gap-4">
                      <h3 className="font-bold">
                        {item.role} — {item.company}
                      </h3>
                      <p className="shrink-0 text-sm">
                        {[item.startDate, item.endDate]
                          .filter(Boolean)
                          .join(" – ")}
                      </p>
                    </div>
                    {item.location ? <p>{item.location}</p> : null}
                    {item.description ? (
                      <p className="mt-1 whitespace-pre-line">
                        {item.description}
                      </p>
                    ) : null}
                    {item.highlights.length ? (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5">
                        {item.highlights.map((highlight) => (
                          <li className="break-inside-avoid" key={highlight}>
                            {highlight}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (section === "projects" && data.projects.length) {
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Projects</SectionTitle>
              <div className="space-y-4">
                {data.projects.map((item) => (
                  <div className="cv-item break-inside-avoid" key={item.id}>
                    <h3 className="font-bold">{item.title}</h3>
                    {item.shortDescription ? <p>{item.shortDescription}</p> : null}
                    {item.longDescription ? (
                      <p className="mt-1 whitespace-pre-line">
                        {item.longDescription}
                      </p>
                    ) : null}
                    {item.technologies.length ? (
                      <p className="mt-1">
                        <strong>Technologies:</strong>{" "}
                        {item.technologies.join(", ")}
                      </p>
                    ) : null}
                    {item.highlights.length ? (
                      <ul className="mt-1 list-disc pl-5">
                        {item.highlights.map((highlight) => (
                          <li key={highlight}>{highlight}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (section === "education" && data.education.length) {
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Education</SectionTitle>
              <div className="space-y-3">
                {data.education.map((item) => (
                  <div className="cv-item break-inside-avoid" key={item.id}>
                    <div className="flex justify-between gap-4">
                      <h3 className="font-bold">
                        {[item.qualification, item.fieldOfStudy]
                          .filter(Boolean)
                          .join(", ") || item.institution}
                      </h3>
                      <p className="shrink-0">
                        {[item.startDate, item.endDate]
                          .filter(Boolean)
                          .join(" – ")}
                      </p>
                    </div>
                    {item.qualification || item.fieldOfStudy ? (
                      <p>{item.institution}</p>
                    ) : null}
                    {item.description ? <p className="mt-1">{item.description}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          );
        }
        if (section === "skills" && data.skills.length) {
          const groups = data.skills.reduce<Record<string, string[]>>(
            (result, skill) => {
              const category = skill.category || "Skills";
              result[category] = [...(result[category] ?? []), skill.name];
              return result;
            },
            {},
          );
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Skills</SectionTitle>
              <div className="space-y-1">
                {Object.entries(groups).map(([category, skills]) => (
                  <p key={category}>
                    <strong>{category}:</strong> {skills.join(", ")}
                  </p>
                ))}
              </div>
            </section>
          );
        }
        if (section === "certifications" && data.certifications.length) {
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Certifications</SectionTitle>
              {data.certifications.map((item) => (
                <p key={item.id}>
                  {item.name}
                  {item.issuer ? ` — ${item.issuer}` : ""}
                </p>
              ))}
            </section>
          );
        }
        if (section === "languages" && data.languages.length) {
          return (
            <section className="cv-section mb-5" key={section}>
              <SectionTitle>Languages</SectionTitle>
              <p>
                {data.languages
                  .map((item) =>
                    [item.name, item.proficiency].filter(Boolean).join(" — "),
                  )
                  .join(", ")}
              </p>
            </section>
          );
        }
        return null;
      })}
    </article>
  );
}
