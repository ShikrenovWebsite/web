import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SafeReadme } from "@/components/admin/safe-readme";

test("README rendering escapes HTML and rejects unsafe link protocols", () => {
  const markup = renderToStaticMarkup(
    createElement(SafeReadme, {
      repositoryUrl: "https://github.com/ExampleOrg/example",
      markdown: [
        "# Safe preview",
        "",
        "<script>alert('unsafe')</script>",
        "",
        "[Unsafe](javascript:alert(1))",
        "",
        "[Repository](https://github.com/ExampleOrg/example)",
      ].join("\n"),
    }),
  );

  assert.doesNotMatch(markup, /<script>/);
  assert.match(markup, /&lt;script&gt;/);
  assert.doesNotMatch(markup, /href="javascript:/);
  assert.match(markup, /href="https:\/\/github\.com\/ExampleOrg\/example"/);
});
