import {
  ArrowDownRight,
  ArrowUpRight,
  GitFork,
  Link2,
  Mail,
} from "lucide-react";
import ASCIIText from "@/components/ASCIIText";
import Shuffle from "@/components/Shuffle";

function TerminalEntry({
  command,
  children,
  prominent = false,
}: {
  command: string;
  children: React.ReactNode;
  prominent?: boolean;
}) {
  return (
    <div className="terminal-entry">
      <dt>
        <span aria-hidden="true">$</span> {command}
      </dt>
      <dd className={prominent ? "terminal-name public-display" : undefined}>
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
  github,
  linkedin,
  stack,
}: {
  fullName: string;
  headline: string;
  introduction: string;
  location: string;
  email?: string;
  github?: string;
  linkedin?: string;
  stack: string[];
}) {
  return (
    <section className="public-hero" data-portfolio-section id="intro">
      <div className="hero-terminal">
        <header className="hero-terminal-bar">
          <span>portfolio-terminal</span>
          <div aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        </header>
        <div className="hero-terminal-body">
          <dl>
            <TerminalEntry command="whoami" prominent>
              <Shuffle
                className="terminal-name-shuffle"
                duration={0.4}
                shuffleTimes={2}
                tag="span"
                text={fullName.toUpperCase()}
                threshold={0.15}
                triggerOnHover
                triggerOnce
              />
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
          </dl>
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
      </div>

      <div className="public-hero-visual">
        <div className="public-hero-visual-bar">
          <span>
            <i />
            terminal.identity
          </span>
          <span>ASCII / PS</span>
        </div>
        <div className="public-ascii-stage">
          <ASCIIText
            asciiFontSize={7}
            enableWaves={false}
            planeBaseHeight={7}
            text="PS"
            textColor="#32d716"
            textFontSize={205}
          />
        </div>
        {stack.length ? (
          <div className="public-stack-strip">
            <span>Published stack</span>
            <div>
              {stack.slice(0, 4).map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
