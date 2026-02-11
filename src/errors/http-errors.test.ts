import { AppError } from "./app-error.js";
import {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from "./http-errors.js";

const errorClasses = [
  { Class: BadRequestError, status: 400, defaultMsg: "Bad request" },
  { Class: UnauthorizedError, status: 401, defaultMsg: "Unauthorized" },
  { Class: NotFoundError, status: 404, defaultMsg: "Not found" },
  { Class: ConflictError, status: 409, defaultMsg: "Conflict" },
  { Class: RateLimitError, status: 429, defaultMsg: "Too many requests" },
] as const;

describe("HTTP Error classes", () => {
  for (const { Class, status, defaultMsg } of errorClasses) {
    describe(Class.name, () => {
      it(`has statusCode ${status}`, () => {
        const err = new Class();
        expect(err.statusCode).toBe(status);
      });

      it(`has default message "${defaultMsg}"`, () => {
        const err = new Class();
        expect(err.message).toBe(defaultMsg);
      });

      it("accepts a custom message", () => {
        const err = new Class("custom message");
        expect(err.message).toBe("custom message");
      });

      it("extends AppError", () => {
        const err = new Class();
        expect(err).toBeInstanceOf(AppError);
      });

      it("extends Error", () => {
        const err = new Class();
        expect(err).toBeInstanceOf(Error);
      });
    });
  }
});
