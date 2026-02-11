import { Type, type Static } from "@sinclair/typebox";

export const ShortenBody = Type.Object({
  url: Type.String({ format: "uri" }),
  expiresAt: Type.Optional(Type.String({ format: "date-time" })),
});
export type ShortenBody = Static<typeof ShortenBody>;

export const ShortenResponse = Type.Object({
  id: Type.String(),
  shortCode: Type.String(),
  shortUrl: Type.String(),
  originalUrl: Type.String(),
  expiresAt: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String(),
});
export type ShortenResponse = Static<typeof ShortenResponse>;

export const RedirectParams = Type.Object({
  code: Type.String(),
});
export type RedirectParams = Static<typeof RedirectParams>;
