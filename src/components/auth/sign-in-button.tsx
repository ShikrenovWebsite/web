"use client";

import { GitFork } from "lucide-react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignInButton({ callbackUrl = "/admin" }: { callbackUrl?: string }) {
  return (
    <Button
      className="w-full"
      onClick={() => signIn("github", { callbackUrl })}
      type="button"
    >
      <GitFork aria-hidden="true" className="size-4" />
      Continue with GitHub
    </Button>
  );
}
