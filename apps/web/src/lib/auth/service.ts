import { compare, hash } from "bcryptjs";
import {
  emailSchema,
  loginSchema,
  signupSchema,
  type LoginInput,
  type SignupInput,
} from "@kdl/shared";
import { hashToken, randomToken } from "@kdl/shared/crypto";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
};

export type AuthSession = {
  tokenHash: string;
  userId: string;
  expiresAt: Date;
};

export type AuthStore = {
  findUserByEmail(email: string): Promise<AuthUser | null>;
  createUser(input: {
    email: string;
    name: string;
    passwordHash: string;
  }): Promise<AuthUser>;
  createSession(input: AuthSession): Promise<void>;
  findSession(
    tokenHash: string,
  ): Promise<(AuthSession & { user: Omit<AuthUser, "passwordHash"> }) | null>;
  deleteSession(tokenHash: string): Promise<void>;
};

export class AuthError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 400,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function signupUser(store: AuthStore, raw: SignupInput) {
  const input = signupSchema.parse(raw);
  const existing = await store.findUserByEmail(input.email.toLowerCase());
  if (existing) {
    throw new AuthError(
      "An account with this email already exists.",
      "CONFLICT",
      409,
    );
  }
  const passwordHash = await hash(input.password, 12);
  const user = await store.createUser({
    email: input.email.toLowerCase(),
    name: input.name,
    passwordHash,
  });
  return issueSession(store, user);
}

export async function loginUser(store: AuthStore, raw: LoginInput) {
  const input = loginSchema.parse(raw);
  const user = await store.findUserByEmail(input.email.toLowerCase());
  if (!user) {
    throw new AuthError("Invalid email or password.", "UNAUTHORIZED", 401);
  }
  const matches = await compare(input.password, user.passwordHash);
  if (!matches) {
    throw new AuthError("Invalid email or password.", "UNAUTHORIZED", 401);
  }
  return issueSession(store, user);
}

export async function loginWithGoogle(
  store: AuthStore,
  profile: { email: string; name: string },
) {
  const email = emailSchema.parse(profile.email).toLowerCase();
  const name =
    profile.name.trim().slice(0, 80) || email.split("@")[0] || "Google user";
  let user = await store.findUserByEmail(email);
  if (!user) {
    user = await store.createUser({
      email,
      name,
      passwordHash: await hash(randomToken(), 12),
    });
  }
  return issueSession(store, user);
}

export async function getSessionUser(
  store: AuthStore,
  token: string | undefined,
) {
  if (!token) {
    return null;
  }
  const session = await store.findSession(hashToken(token));
  if (!session || session.expiresAt.getTime() < Date.now()) {
    return null;
  }
  return session.user;
}

export async function logoutUser(store: AuthStore, token: string | undefined) {
  if (!token) {
    return;
  }
  await store.deleteSession(hashToken(token));
}

async function issueSession(store: AuthStore, user: AuthUser) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await store.createSession({
    tokenHash: hashToken(token),
    userId: user.id,
    expiresAt,
  });
  return {
    token,
    expiresAt,
    user: { id: user.id, email: user.email, name: user.name },
  };
}
