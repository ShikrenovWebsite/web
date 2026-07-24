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
    <div className="grid gap-2 sm:grid-cols-[4rem_1fr] sm:items-start">
      <span className="font-mono text-[0.68rem] font-medium tracking-[0.16em] text-muted-foreground">
        {index}
      </span>
      <div>
        <h2 className="public-heading text-xl font-semibold tracking-[-0.035em] sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
