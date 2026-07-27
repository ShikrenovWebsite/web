import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="public-header">
      <div className="public-header-inner">
        <Link className="public-wordmark public-display" href="#intro">
          portfolio<span aria-hidden="true">.</span>
        </Link>
        <span className="public-header-status">
          <i aria-hidden="true" />
          Available portfolio
        </span>
        <Link className="public-admin-link" href="/admin">
          Admin
          <ArrowUpRight aria-hidden="true" />
        </Link>
      </div>
    </header>
  );
}
