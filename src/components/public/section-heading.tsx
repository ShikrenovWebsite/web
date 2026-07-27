import Shuffle from "@/components/Shuffle";

export function PublicSectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description?: string;
}) {
  return (
    <header className="public-section-heading">
      <span>{index}</span>
      <Shuffle
        className="public-display"
        duration={0.32}
        shuffleTimes={1}
        tag="h2"
        text={title}
        threshold={0.2}
        triggerOnHover
        triggerOnce
      />
      {description ? <p>{description}</p> : null}
    </header>
  );
}
