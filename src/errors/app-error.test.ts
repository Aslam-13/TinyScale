import { AppError } from "./app-error.js";

describe("AppError", () => {
  it("is an instance of Error", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(Error);
  });

  it("is an instance of AppError", () => {
    const err = new AppError("test", 400);
    expect(err).toBeInstanceOf(AppError);
  });

  it("stores the statusCode", () => {
    const err = new AppError("not found", 404);
    expect(err.statusCode).toBe(404);
  });

  it("stores the message", () => {
    const err = new AppError("something broke", 500);
    expect(err.message).toBe("something broke");
  });

  it("defaults isOperational to true", () => {
    const err = new AppError("test", 400);
    expect(err.isOperational).toBe(true);
  });

  it("allows overriding isOperational to false", () => {
    const err = new AppError("fatal", 500, false);
    expect(err.isOperational).toBe(false);
  });
});
