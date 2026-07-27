import type { PublicExperience } from "./portfolio-types";

export function ExperienceList({ items }: { items: PublicExperience[] }) {
  return (
    <div className="experience-editorial">
      {items.map((item, index) => (
        <article
          className={`experience-entry ${item.current ? "is-current" : ""}`}
          key={item.id}
        >
          <div className="experience-identity">
            <span className="experience-index">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="public-display">{item.company}</h3>
            <p>{item.role}</p>
          </div>
          <div className="experience-detail">
            {item.description ? (
              <p className="experience-description">{item.description}</p>
            ) : null}
            {item.highlights.length ? (
              <ul>
                {item.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>
          {item.meta ? <time className="experience-date">{item.meta}</time> : null}
        </article>
      ))}
    </div>
  );
}
