import { ArrowDownRight, Mail } from "lucide-react";

function TerminalEntry({
  command,
  children,
}: {
  command: string;
  children: React.ReactNode;
}) {
  return (
    <div className="terminal-entry mb-8 md:mb-10">
      <dt className="!text-lg font-semibold text-green-500 md:!text-xl">
        <span aria-hidden="true">$</span> <code>{command}</code>
      </dt>

      <dd className="mt-3 !text-3xl leading-[1.3] text-white md:!text-4xl">
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
                  <strong className="terminal-person-name public-display block !text-5xl font-bold leading-none tracking-tight md:!text-7xl">
                    {fullName}
                  </strong>
                </TerminalEntry>

                <TerminalEntry command="role">
                  <span>{headline || "Product-minded software engineer"}</span>
                </TerminalEntry>

                <TerminalEntry command="location">
                  <span>{location || "Sofia, Bulgaria"}</span>
                </TerminalEntry>

                <TerminalEntry command="status">
                  <span className="terminal-status">
                    Available for selected work
                  </span>
                </TerminalEntry>

                {email ? (
                  <TerminalEntry command="contact">
                    <a
                      className="terminal-contact-link"
                      href={`mailto:${email}`}
                    >
                      {email}
                    </a>
                  </TerminalEntry>
                ) : null}
              </dl>

              <div
                aria-label="Terminal ready for the next command"
                className="terminal-ready-prompt mt-10 !text-2xl md:!text-3xl"
                role="status"
              >
                <span aria-hidden="true">$</span>
                <i aria-hidden="true" className="terminal-caret" />
              </div>
            </div>

            <div className="hero-terminal-actions">
              <span className="terminal-actions-prompt !text-lg md:!text-xl">
                $ actions
              </span>

              <a
                className="!min-h-14 !px-5 !text-xl md:!text-2xl"
                href="#projects"
              >
                Selected work
                <ArrowDownRight aria-hidden="true" />
              </a>

              {email ? (
                <a
                  className="!min-h-14 !px-5 !text-xl md:!text-2xl"
                  href={`mailto:${email}`}
                >
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
