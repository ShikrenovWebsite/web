import {
  ArrowDownRight,
  ArrowUpRight,
  GitFork,
  Link2,
  Mail,
} from "lucide-react";

function TerminalEntry({
  command,
  children,
}: {
  command: string;
  children: React.ReactNode;
}) {
  return (
    <div className="terminal-entry">
      <dt>
        <span aria-hidden="true">$</span>
        <code>{command}</code>
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

export function PortfolioHero({
  fullName,
  headline,
  location,
  email,
  github,
  linkedin,
}: {
  fullName: string;
  headline: string;
  introduction: string;
  location: string;
  email?: string;
  github?: string;
  linkedin?: string;
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
          <span>portfolio-terminal</span>
        </header>
        <div className="hero-terminal-body">
          <div className="hero-terminal-workspace">
            <div className="hero-terminal-command-column">
              <dl>
                <TerminalEntry command="whoami">
                  <strong className="terminal-person-name public-display">
                    {fullName}
                  </strong>
                </TerminalEntry>
                <TerminalEntry command="role">
                  {headline || "Product-minded software engineer"}
                </TerminalEntry>
                <TerminalEntry command="location">
                  {location || "Sofia, Bulgaria"}
                </TerminalEntry>
                <TerminalEntry command="status">
                  <span className="terminal-status">
                    <i aria-hidden="true" />
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
                className="terminal-ready-prompt"
                role="status"
              >
                <span aria-hidden="true">$</span>
                <i aria-hidden="true" className="terminal-caret" />
              </div>
              <div className="hero-terminal-socials">
                {github ? (
                  <a href={github} rel="noreferrer" target="_blank">
                    <GitFork aria-hidden="true" />
                    GitHub
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ) : null}
                {linkedin ? (
                  <a href={linkedin} rel="noreferrer" target="_blank">
                    <Link2 aria-hidden="true" />
                    LinkedIn
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ) : null}
              </div>
            </div>
            <div className="hero-terminal-actions">
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
