import { Type, type Static } from "@sinclair/typebox";

export const StatsParams = Type.Object({
  code: Type.String(),
});
export type StatsParams = Static<typeof StatsParams>;

export const StatsResponse = Type.Object({
  shortCode: Type.String(),
  originalUrl: Type.String(),
  totalClicks: Type.Number(),
  clicksByDate: Type.Array(
    Type.Object({
      date: Type.String(),
      count: Type.Number(),
    })
  ),
  referrers: Type.Array(
    Type.Object({
      referrer: Type.String(),
      count: Type.Number(),
    })
  ),
  countries: Type.Array(
    Type.Object({
      country: Type.String(),
      count: Type.Number(),
    })
  ),
});
export type StatsResponse = Static<typeof StatsResponse>;
