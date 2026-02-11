import { nanoid, customAlphabet } from "nanoid";

// URL-safe alphabet with lookalikes removed (0/O, 1/l/I)
const ALPHABET =
  "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

const generateCode = customAlphabet(ALPHABET, CODE_LENGTH);

export function generateShortCode(): string {
  return generateCode();
}
