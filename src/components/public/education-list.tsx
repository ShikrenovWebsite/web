import type { PublicEducation } from "./portfolio-types";

export function EducationList({ items }: { items: PublicEducation[] }) {
  return (
    <div className="divide-y border-y">
      {items.map((item) => (
        <article
          className="grid gap-2 py-4 sm:grid-cols-[1fr_auto] sm:gap-5"
          key={item.id}
        >
          <div>
            <h3 className="text-sm font-semibold">{item.institution}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {[item.qualification, item.fieldOfStudy]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {item.description ? (
              <p className="mt-2 max-w-2xl whitespace-pre-line text-sm leading-6 text-muted-foreground">
                {item.description}
              </p>
            ) : null}
            {item.achievements.length ? (
              <ul className="mt-2 grid gap-1 pl-4 text-sm text-muted-foreground marker:text-foreground">
                {item.achievements.map((achievement) => (
                  <li className="list-disc" key={achievement}>
                    {achievement}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {item.meta ? (
            <p className="text-xs text-muted-foreground sm:text-right">
              {item.meta}
            </p>
          ) : null}
        </article>
      ))}
    </div>
  );
}
