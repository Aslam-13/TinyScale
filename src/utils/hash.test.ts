import { hashPassword, verifyPassword } from "./hash.js";

describe("hashPassword", () => {
  it("returns a bcrypt hash starting with $2b$", async () => {
    const hash = await hashPassword("mypassword");
    expect(hash.startsWith("$2b$")).toBe(true);
  });

  it("generates different salts for the same password", async () => {
    const hash1 = await hashPassword("mypassword");
    const hash2 = await hashPassword("mypassword");
    expect(hash1).not.toBe(hash2);
  });
});

describe("verifyPassword", () => {
  it("returns true for a correct password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("correctpassword", hash);
    expect(result).toBe(true);
  });

  it("returns false for an incorrect password", async () => {
    const hash = await hashPassword("correctpassword");
    const result = await verifyPassword("wrongpassword", hash);
    expect(result).toBe(false);
  });
});
