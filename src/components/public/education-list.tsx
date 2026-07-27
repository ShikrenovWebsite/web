import { GraduationCap } from "lucide-react";
import type { PublicEducation } from "./portfolio-types";

export function EducationList({ items }: { items: PublicEducation[] }) {
  return (
    <div className="education-editorial">
      {items.map((item) => (
        <article key={item.id}>
          <GraduationCap aria-hidden="true" />
          <div>
            {item.meta ? <time>{item.meta}</time> : null}
            <h3 className="public-display">{item.institution}</h3>
            <p className="education-degree">
              {[item.qualification, item.fieldOfStudy]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {item.description ? (
              <p className="education-detail">{item.description}</p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
