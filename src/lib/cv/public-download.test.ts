import assert from "node:assert/strict";
import test from "node:test";
import {
  publicCvDownloadResponse,
  selectLatestPublicCvSnapshot,
} from "./public-download-policy";
import { buildCvPdfFilename } from "./filename";
import { flatCvSkillsText, flattenCvSkills } from "./skills-layout";

test("selects the newest valid immutable PDF snapshot", () => {
  const earlier = {
    id: "earlier",
    exportedAt: new Date("2026-07-01T00:00:00.000Z"),
    mimeType: "application/pdf",
    sizeBytes: 100,
  };
  const latest = {
    id: "latest",
    exportedAt: new Date("2026-07-02T00:00:00.000Z"),
    mimeType: "application/pdf",
    sizeBytes: 200,
  };
  const invalid = {
    id: "invalid",
    exportedAt: new Date("2026-07-03T00:00:00.000Z"),
    mimeType: "text/plain",
    sizeBytes: 200,
  };
  assert.equal(selectLatestPublicCvSnapshot([earlier, invalid, latest]), latest);
  assert.equal(selectLatestPublicCvSnapshot([]), null);
});

test("creates a safe public PDF attachment", async () => {
  const response = publicCvDownloadResponse({
    bytes: new Uint8Array([37, 80, 68, 70]),
    filename: buildCvPdfFilename("Petar Shikrenov", ""),
    sizeBytes: 4,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "application/pdf");
  assert.equal(
    response.headers.get("Content-Disposition"),
    'attachment; filename="Petar-Shikrenov-CV.pdf"',
  );
});

test("flattens CV skills in explicit order without category labels or duplicates", () => {
  const skills = flattenCvSkills([
    { id: "1", name: "TypeScript" },
    { id: "2", name: "Node" },
    { id: "3", name: "Node.js" },
    { id: "4", name: "Postgres" },
  ]);
  assert.deepEqual(skills, [
    { id: "1", name: "TypeScript" },
    { id: "2", name: "Node.js" },
    { id: "4", name: "PostgreSQL" },
  ]);
  assert.equal(flatCvSkillsText(skills), "TypeScript | Node.js | PostgreSQL");
});
