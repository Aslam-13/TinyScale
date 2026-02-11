import { Type, type Static } from "@sinclair/typebox";

export const RegisterBody = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 8 }),
});
export type RegisterBody = Static<typeof RegisterBody>;

export const LoginBody = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});
export type LoginBody = Static<typeof LoginBody>;

export const AuthResponse = Type.Object({
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
  }),
  token: Type.String(),
  apiKey: Type.Optional(Type.String()),
});
export type AuthResponse = Static<typeof AuthResponse>;
