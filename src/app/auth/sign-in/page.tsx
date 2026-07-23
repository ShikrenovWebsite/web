import { SignInButton } from "@/components/auth/sign-in-button";
import { LockKeyhole } from "@/components/ui/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSafeAdminCallbackUrl } from "@/lib/auth";

export const metadata = {
  title: "Admin sign in",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const params = await searchParams;
  const callbackUrl = getSafeAdminCallbackUrl(params.callbackUrl);

  return (
    <main className="grid min-h-screen place-items-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 grid size-10 place-items-center rounded-lg bg-muted">
            <LockKeyhole aria-hidden="true" className="size-5" />
          </div>
          <CardTitle>Private administration</CardTitle>
          <CardDescription>
            Sign in with the approved GitHub owner account. Authentication alone
            does not grant administrator access.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {params.error ? (
            <p
              className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              This GitHub account is not approved to administer the portfolio.
            </p>
          ) : null}
          <SignInButton callbackUrl={callbackUrl} />
        </CardContent>
      </Card>
    </main>
  );
}
