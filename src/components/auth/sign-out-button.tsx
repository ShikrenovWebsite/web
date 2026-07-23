"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <Button
      aria-label="Sign out"
      onClick={() => signOut({ callbackUrl: "/" })}
      size="icon"
      title="Sign out"
      type="button"
      variant="ghost"
    >
      <LogOut aria-hidden="true" className="size-4" />
    </Button>
  );
}
