"use client";

import { Check, LoaderCircle, RefreshCw, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  acceptHighConfidenceSuggestions,
  refreshSuggestions,
  updateSkillSuggestion,
  type SkillSuggestionActionResult,
} from "@/app/admin/skills/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Suggestion = {
  id: string;
  displayName: string;
  category: string | null;
  sourceCount: number;
  confidence: number;
  status: "PENDING" | "ACCEPTED" | "IGNORED";
  evidence: Array<{ sourceName: string; sourceType: string }>;
};

export function SkillSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<SkillSuggestionActionResult>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  const pendingSuggestions = suggestions.filter(
    (suggestion) => suggestion.status === "PENDING",
  );
  const ignoredSuggestions = suggestions.filter(
    (suggestion) => suggestion.status === "IGNORED",
  );

  return (
    <section className="space-y-4" aria-labelledby="skill-suggestions">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold" id="skill-suggestions">
            Suggested skills
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Staged from accepted GitHub sources and project technologies. Nothing
            is published automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending}
            onClick={() => run(() => refreshSuggestions())}
            size="sm"
            variant="outline"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Refresh
          </Button>
          <Button
            disabled={
              pending ||
              !pendingSuggestions.some(
                (suggestion) => suggestion.confidence >= 0.9,
              )
            }
            onClick={() => run(() => acceptHighConfidenceSuggestions())}
            size="sm"
          >
            {pending ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 animate-spin"
              />
            ) : (
              <Check aria-hidden="true" className="size-4" />
            )}
            Accept high confidence
          </Button>
        </div>
      </div>

      {pendingSuggestions.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {pendingSuggestions.map((suggestion) => (
            <Card key={suggestion.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle>{suggestion.displayName}</CardTitle>
                  <Badge>{Math.round(suggestion.confidence * 100)}%</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {suggestion.category ?? "Uncategorized"} ·{" "}
                  {suggestion.sourceCount} source
                  {suggestion.sourceCount === 1 ? "" : "s"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestion.evidence.map((item) => (
                    <Badge key={`${item.sourceType}:${item.sourceName}`}>
                      {item.sourceName}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        updateSkillSuggestion({
                          suggestionId: suggestion.id,
                          action: "ACCEPT",
                        }),
                      )
                    }
                    size="sm"
                  >
                    <Check aria-hidden="true" className="size-4" />
                    Accept
                  </Button>
                  <Button
                    disabled={pending}
                    onClick={() =>
                      run(() =>
                        updateSkillSuggestion({
                          suggestionId: suggestion.id,
                          action: "IGNORE",
                        }),
                      )
                    }
                    size="sm"
                    variant="outline"
                  >
                    <X aria-hidden="true" className="size-4" />
                    Ignore
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          No pending suggestions. Refresh after accepting repositories or editing
          project technologies.
        </p>
      )}

      {ignoredSuggestions.length ? (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium">
            Ignored suggestions ({ignoredSuggestions.length})
          </summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {ignoredSuggestions.map((suggestion) => (
              <div
                className="flex items-center justify-between gap-3 rounded-md border p-3"
                key={suggestion.id}
              >
                <span className="text-sm">{suggestion.displayName}</span>
                <Button
                  disabled={pending}
                  onClick={() =>
                    run(() =>
                      updateSkillSuggestion({
                        suggestionId: suggestion.id,
                        action: "RESTORE",
                      }),
                    )
                  }
                  size="sm"
                  variant="outline"
                >
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Restore
                </Button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
