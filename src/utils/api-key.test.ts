import { generateApiKey } from "./api-key.js";

describe("generateApiKey", () => {
  it("starts with ts_ prefix", () => {
    const key = generateApiKey();
    expect(key.startsWith("ts_")).toBe(true);
  });

  it("has total length of 35 (3 prefix + 32 random)", () => {
    const key = generateApiKey();
    expect(key).toHaveLength(35);
  });

  it("generates unique keys over 100 calls", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      keys.add(generateApiKey());
    }
    expect(keys.size).toBe(100);
  });

  it("contains only URL-safe characters", () => {
    const urlSafe = /^[A-Za-z0-9_-]+$/;
    for (let i = 0; i < 50; i++) {
      const key = generateApiKey();
      expect(key).toMatch(urlSafe);
    }
  });
});
