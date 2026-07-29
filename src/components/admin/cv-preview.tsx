import type { CvDocumentData } from "@/lib/cv/document";
import { flatCvSkillsText } from "@/lib/cv/skills-layout";
import { cn } from "@/lib/utils";

function SectionTitle({ children }: { children: string }) {
  return (
    <h2 className="cv-section-title mb-[2.5mm] border-b border-black pb-[1mm] text-[8pt] font-bold uppercase tracking-[0.12em]">
      {children}
    </h2>
  );
}

function Experience({ data }: { data: CvDocumentData }) {
  if (!data.experience.length) return null;
  return (
    <section className="cv-section">
      <SectionTitle>Experience</SectionTitle>
      <div className="space-y-[3mm]">
        {data.experience.map((item) => (
          <div className="cv-item break-inside-avoid" key={item.id}>
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-bold">
                {item.role} · {item.company}
              </h3>
              <p className="shrink-0 text-[7.5pt]">
                {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
              </p>
            </div>
            {item.location ? (
              <p className="text-[7.5pt] text-neutral-600">{item.location}</p>
            ) : null}
            {item.description ? (
              <p className="mt-[1mm] whitespace-pre-line">{item.description}</p>
            ) : null}
            {item.highlights.length ? (
              <ul className="mt-[1mm] list-disc space-y-[0.5mm] pl-[4mm]">
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

function Projects({ data }: { data: CvDocumentData }) {
  if (!data.projects.length) return null;
  return (
    <section className="cv-section">
      <SectionTitle>Selected projects</SectionTitle>
      <div className="space-y-[3mm]">
        {data.projects.map((item) => (
          <div className="cv-item break-inside-avoid" key={item.id}>
            <h3 className="font-bold">{item.title}</h3>
            {item.shortDescription ? <p>{item.shortDescription}</p> : null}
            {item.longDescription ? (
              <p className="mt-[1mm] whitespace-pre-line">
                {item.longDescription}
              </p>
            ) : null}
            {item.highlights.length ? (
              <ul className="mt-[1mm] list-disc pl-[4mm]">
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
            {item.technologies.length ? (
              <p className="mt-[1mm] text-[7.5pt]">
                <strong>Stack:</strong> {item.technologies.join(", ")}
              </p>
            ) : null}
            {[item.liveUrl, item.sourceCodeUrl].filter(Boolean).length ? (
              <p className="mt-[1mm] break-all text-[7pt]">
                {[item.liveUrl, item.sourceCodeUrl]
                  .filter(Boolean)
                  .map((url) => (
                    <a className="underline" href={url} key={url}>
                      {url}
                    </a>
                  ))
                  .reduce<React.ReactNode[]>(
                    (items, link, index) => [
                      ...items,
                      ...(index ? [" · "] : []),
                      link,
                    ],
                    [],
                  )}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Education({ data }: { data: CvDocumentData }) {
  if (!data.education.length) return null;
  return (
    <section className="cv-section">
      <SectionTitle>Education</SectionTitle>
      <div className="space-y-[2mm]">
        {data.education.map((item) => (
          <div className="cv-item break-inside-avoid" key={item.id}>
            <h3 className="font-bold">
              {[item.qualification, item.fieldOfStudy]
                .filter(Boolean)
                .join(", ") || item.institution}
            </h3>
            {item.qualification || item.fieldOfStudy ? (
              <p>{item.institution}</p>
            ) : null}
            <p className="text-[7pt] text-neutral-600">
              {[item.startDate, item.endDate].filter(Boolean).join(" – ")}
            </p>
            {item.description ? <p className="mt-[1mm]">{item.description}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function Skills({ data }: { data: CvDocumentData }) {
  if (!data.skills.length) return null;
  return (
    <section className="cv-section">
      <SectionTitle>Skills</SectionTitle>
      <p className="leading-[1.45]">{flatCvSkillsText(data.skills)}</p>
    </section>
  );
}

function SupportingSections({ data }: { data: CvDocumentData }) {
  return (
    <>
      <div
        className={cn(
          "grid items-start gap-[5mm]",
          data.education.length && data.skills.length
            ? "sm:grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)]"
            : "grid-cols-1",
        )}
      >
        <Education data={data} />
        <Skills data={data} />
      </div>
      {data.certifications.length ? (
        <section className="cv-section">
          <SectionTitle>Certifications</SectionTitle>
          {data.certifications.map((item) => (
            <p className="mb-[1mm]" key={item.id}>
              <strong>{item.name}</strong>
              {item.issuer ? ` · ${item.issuer}` : ""}
            </p>
          ))}
        </section>
      ) : null}
      {data.languages.length ? (
        <section className="cv-section">
          <SectionTitle>Languages</SectionTitle>
          <p>
            {data.languages
              .map((item) =>
                [item.name, item.proficiency].filter(Boolean).join(" · "),
              )
              .join(", ")}
          </p>
        </section>
      ) : null}
    </>
  );
}

export function CvPreview({ data }: { data: CvDocumentData }) {
  const compact = data.version.layoutMode === "COMPACT_ONE_PAGE";
  const contact = [
    data.profile.email,
    data.profile.phone,
    data.profile.location,
    data.profile.website,
    ...data.profile.links,
  ].filter(Boolean);

  return (
    <article
      className={cn(
        "cv-sheet mx-auto min-h-[297mm] w-[210mm] max-w-full bg-white text-black shadow-sm print:shadow-none",
        compact
          ? "p-[10mm] text-[8.4pt] leading-[1.28]"
          : "p-[14mm] text-[9.2pt] leading-[1.36]",
      )}
    >
      <header className={compact ? "mb-[4mm]" : "mb-[6mm]"}>
        <div className="flex items-end justify-between gap-5 border-b border-black pb-[3mm]">
          <div>
            <h1 className="text-[24pt] font-bold leading-none tracking-[-0.04em]">
              {data.profile.fullName || "Curriculum Vitae"}
            </h1>
            {data.version.headline ? (
              <p className="mt-[1.5mm] text-[10.5pt]">
                {data.version.headline}
              </p>
            ) : null}
          </div>
          {contact.length ? (
          <p className="max-w-[88mm] text-right text-[7.2pt] leading-[1.35]">
              {contact.map((value, index) => (
                <span key={value}>
                  {index ? " · " : ""}
                  {value.startsWith("http") ? (
                    <a className="underline" href={value}>
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </span>
              ))}
            </p>
          ) : null}
        </div>
        {data.version.summary ? (
          <p className="mt-[3mm] whitespace-pre-line">
            {data.version.summary}
          </p>
        ) : null}
      </header>

      <main className={compact ? "space-y-[4mm]" : "space-y-[6mm]"}>
        <Experience data={data} />
        <Projects data={data} />
        <SupportingSections data={data} />
      </main>
    </article>
  );
}
