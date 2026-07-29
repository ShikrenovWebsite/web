import assert from "node:assert/strict";
import test from "node:test";
import { buildCvPdfFilename } from "./filename";

test("builds a single clean filename from the CV name", () => {
  assert.equal(
    buildCvPdfFilename("Petar Shikrenov", "Someone Else"),
    "Petar-Shikrenov-CV.pdf",
  );
  assert.equal(
    buildCvPdfFilename("Product-minded Software Engineer", "Petar Shikrenov"),
    "Product-minded-Software-Engineer-CV.pdf",
  );
  assert.equal(
    buildCvPdfFilename("Petar Shikrenov CV", ""),
    "Petar-Shikrenov-CV.pdf",
  );
  assert.equal(
    buildCvPdfFilename("petar shikrenov cv", ""),
    "petar-shikrenov-CV.pdf",
  );
});

test("normalizes whitespace and unsafe filename characters", () => {
  assert.equal(
    buildCvPdfFilename("  Product:  Engineer / CV  ", ""),
    "Product-Engineer-CV.pdf",
  );
  assert.equal(
    buildCvPdfFilename("Frontend   Developer", ""),
    "Frontend-Developer-CV.pdf",
  );
});

test("uses fallbacks without adding owner names or generated counters", () => {
  assert.equal(
    buildCvPdfFilename("", "Peter Shikrenov"),
    "Peter-Shikrenov-CV.pdf",
  );
  assert.equal(buildCvPdfFilename("", ""), "CV.pdf");
  assert.equal(
    buildCvPdfFilename("Product-minded Software Engineer (2)", "Petar Shikrenov"),
    "Product-minded-Software-Engineer-CV.pdf",
  );
  assert.equal(
    buildCvPdfFilename("Petar Shikrenov", "Peter Shikrenov"),
    "Petar-Shikrenov-CV.pdf",
  );
});
