import { generateShortCode } from "./short-code.js";

describe("generateShortCode", () => {
  it("returns a string of length 8", () => {
    const code = generateShortCode();
    expect(code).toHaveLength(8);
  });

  it("only contains valid alphabet characters (no lookalikes)", () => {
    const validChars =
      "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      for (const char of code) {
        expect(validChars).toContain(char);
      }
    }
  });

  it("does not contain lookalike characters 0, O, 1, l, I", () => {
    const forbidden = ["0", "O", "1", "l", "I"];
    for (let i = 0; i < 100; i++) {
      const code = generateShortCode();
      for (const char of forbidden) {
        expect(code).not.toContain(char);
      }
    }
  });

  it("generates unique codes over 100 calls", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      codes.add(generateShortCode());
    }
    expect(codes.size).toBe(100);
  });
});
