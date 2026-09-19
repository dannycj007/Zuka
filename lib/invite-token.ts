import { randomInt } from "node:crypto";

const BASE62_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

// 22 base62 characters ~= 131 bits of entropy, comfortably over the
// 128-bit minimum required for guest invite tokens (section 4 of the brief).
const TOKEN_LENGTH = 22;

/**
 * Generates an unguessable, URL-safe capability token for a guest's invite
 * link (the /i/[token] route). Never derive this from phone number, name,
 * or a sequence — it must not be predictable even knowing the guest list.
 */
export function generateInviteToken(): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += BASE62_ALPHABET[randomInt(BASE62_ALPHABET.length)];
  }
  return token;
}
