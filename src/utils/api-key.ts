import { nanoid } from "nanoid";

const PREFIX = "ts_";
const KEY_LENGTH = 32;

export function generateApiKey(): string {
  return PREFIX + nanoid(KEY_LENGTH);
}
