import Link from "next/link";
import { getServerSession } from "next-auth";
import { LockKeyhole } from "@/components/ui/icons";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { authOptions } from "@/lib/auth";

export const metadata = {
  title: "Access denied",
};

export default async function AccessDeniedPage() {
  const session = await getServerSession(authOptions);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 grid size-10 place-items-center rounded-lg bg-muted">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <CardTitle>Access denied</CardTitle>
          <CardDescription>
            This GitHub account is not approved to administer the portfolio.
            Only the configured owner can access the private administration
            area.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {session?.user ? (
            <p className="text-sm text-muted-foreground">
              You are signed in, but this account does not have administrator
              access.
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            {session?.user ? <SignOutButton /> : null}
            <Button asChild variant="outline">
              <Link href="/">Return to portfolio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
