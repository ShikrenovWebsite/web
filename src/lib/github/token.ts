import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getServerEnv } from "@/lib/env";

const TOKEN_VERSION = "v1";

function encryptionKey() {
  return createHash("sha256")
    .update("portfolio-github-token:")
    .update(getServerEnv().AUTH_SECRET)
    .digest();
}

export function encryptGitHubToken(token: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return [
    TOKEN_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(".");
}

export function decryptGitHubToken(value: string) {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");

  if (
    version !== TOKEN_VERSION ||
    !ivValue ||
    !tagValue ||
    !encryptedValue
  ) {
    throw new Error("The stored GitHub token has an unsupported format.");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
