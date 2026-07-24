"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { PublicExperience } from "./portfolio-types";

function initials(company: string) {
  return (
    company
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CO"
  );
}

function ExperienceSummary({ item }: { item: PublicExperience }) {
  return (
    <div className="grid min-w-0 flex-1 grid-cols-[2.5rem_1fr] items-center gap-3 sm:grid-cols-[2.5rem_minmax(0,1fr)_auto]">
      <span
        aria-hidden="true"
        className="grid size-9 place-items-center rounded-lg border bg-muted font-mono text-[0.65rem] font-semibold tracking-wide text-muted-foreground"
      >
        {initials(item.company)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{item.company}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">
          {item.role}
        </span>
      </span>
      <span className="col-start-2 text-xs text-muted-foreground sm:col-auto sm:shrink-0">
        {item.meta}
      </span>
    </div>
  );
}

export function ExperienceList({ items }: { items: PublicExperience[] }) {
  const expandable = items.filter(
    (item) => item.description || item.highlights.length,
  );
  const defaultValue = expandable[0]?.id;

  return (
    <Accordion
      className="border-t"
      collapsible
      defaultValue={defaultValue}
      type="single"
    >
      {items.map((item) => {
        const hasDetails = Boolean(item.description || item.highlights.length);
        if (!hasDetails) {
          return (
            <div className="border-b py-4" key={item.id}>
              <ExperienceSummary item={item} />
            </div>
          );
        }
        return (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger>
              <ExperienceSummary item={item} />
            </AccordionTrigger>
            <AccordionContent>
              <div className="ml-[3.25rem] max-w-2xl border-l pl-4 text-muted-foreground">
                {item.description ? (
                  <p className="whitespace-pre-line leading-6">
                    {item.description}
                  </p>
                ) : null}
                {item.highlights.length ? (
                  <ul className="mt-3 grid gap-1.5 pl-4 leading-6 marker:text-foreground">
                    {item.highlights.map((highlight) => (
                      <li className="list-disc" key={highlight}>
                        {highlight}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
