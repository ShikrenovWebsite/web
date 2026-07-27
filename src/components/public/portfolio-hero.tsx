import { ArrowDownRight, Mail } from "lucide-react";

function TerminalEntry({
  command,
  children,
}: {
  command: string;
  children: React.ReactNode;
}) {
  return (
    <div className="terminal-entry mb-12">
      <dt className="!text-lg font-semibold text-green-500 md:!text-xl">
        <span aria-hidden="true">$</span> <code>{command}</code>
      </dt>

      <dd className="mt-4 !text-3xl leading-relaxed text-white md:!text-4xl">
        {children}
      </dd>
    </div>
  );
}

export function PortfolioHero({
  fullName,
  headline,
  location,
  email,
}: {
  fullName: string;
  headline: string;
  introduction: string;
  location: string;
  email?: string;
}) {
  return (
    <section className="public-hero" data-portfolio-section id="intro">
      <div className="hero-terminal">
        <header className="hero-terminal-bar">
          <div aria-hidden="true" className="hero-terminal-controls">
            <i className="is-close" />
            <i className="is-minimize" />
            <i className="is-expand" />
          </div>
        </header>

        <div className="hero-terminal-body">
          <div className="hero-terminal-workspace">
            <div className="hero-terminal-command-column w-full max-w-5xl">
              <dl>
                <TerminalEntry command="whoami">
                  <strong className="terminal-person-name public-display block !text-7xl font-bold leading-none tracking-tight md:!text-9xl">
                    {fullName}
                  </strong>
                </TerminalEntry>

                <TerminalEntry command="role">
                  <span className="!text-3xl md:!text-4xl">
                    {headline || "Product-minded software engineer"}
                  </span>
                </TerminalEntry>

                <TerminalEntry command="location">
                  <span className="!text-3xl md:!text-4xl">
                    {location || "Sofia, Bulgaria"}
                  </span>
                </TerminalEntry>

                <TerminalEntry command="status">
                  <span className="terminal-status !text-3xl md:!text-4xl">
                    Available for selected work
                  </span>
                </TerminalEntry>

                {email ? (
                  <TerminalEntry command="contact">
                    <a
                      className="terminal-contact-link !text-3xl md:!text-4xl"
                      href={`mailto:${email}`}
                    >
                      {email}
                    </a>
                  </TerminalEntry>
                ) : null}
              </dl>

              <div
                aria-label="Terminal ready for the next command"
                className="terminal-ready-prompt mt-12 !text-3xl md:!text-4xl"
                role="status"
              >
                <span aria-hidden="true">$</span>
                <i aria-hidden="true" className="terminal-caret" />
              </div>
            </div>

            <div className="hero-terminal-actions">
              <span className="terminal-actions-prompt">$ actions</span>

              <a href="#projects">
                Selected work
                <ArrowDownRight aria-hidden="true" />
              </a>

              {email ? (
                <a href={`mailto:${email}`}>
                  <Mail aria-hidden="true" />
                  Start a conversation
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
