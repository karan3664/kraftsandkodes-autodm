import { describe, expect, it } from "vitest";
import {
  AuthError,
  getSessionUser,
  loginUser,
  loginWithGoogle,
  logoutUser,
  signupUser,
  type AuthStore,
  type AuthUser,
} from "./service";

function memoryStore(): AuthStore {
  const users: AuthUser[] = [];
  const sessions = new Map<
    string,
    { tokenHash: string; userId: string; expiresAt: Date }
  >();
  return {
    async findUserByEmail(email) {
      return users.find((user) => user.email === email) ?? null;
    },
    async createUser(input) {
      const user = { id: `user_${users.length + 1}`, ...input };
      users.push(user);
      return user;
    },
    async createSession(input) {
      sessions.set(input.tokenHash, input);
    },
    async findSession(tokenHash) {
      const session = sessions.get(tokenHash);
      if (!session) {
        return null;
      }
      const user = users.find((item) => item.id === session.userId);
      if (!user) {
        return null;
      }
      return {
        ...session,
        user: { id: user.id, email: user.email, name: user.name },
      };
    },
    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },
  };
}

describe("auth", () => {
  it("signs up a user and issues a session", async () => {
    const store = memoryStore();
    const result = await signupUser(store, {
      name: "Karan",
      email: "karan@example.com",
      password: "DevPassword123!",
    });
    expect(result.user.email).toBe("karan@example.com");
    const sessionUser = await getSessionUser(store, result.token);
    expect(sessionUser?.name).toBe("Karan");
  });

  it("logs in with valid credentials", async () => {
    const store = memoryStore();
    await signupUser(store, {
      name: "Karan",
      email: "karan@example.com",
      password: "DevPassword123!",
    });
    const result = await loginUser(store, {
      email: "karan@example.com",
      password: "DevPassword123!",
    });
    expect(result.user.email).toBe("karan@example.com");
  });

  it("rejects a protected lookup without a session", async () => {
    const store = memoryStore();
    await expect(getSessionUser(store, undefined)).resolves.toBeNull();
  });

  it("rejects invalid login", async () => {
    const store = memoryStore();
    await signupUser(store, {
      name: "Karan",
      email: "karan@example.com",
      password: "DevPassword123!",
    });
    await expect(
      loginUser(store, {
        email: "karan@example.com",
        password: "wrong-password",
      }),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("clears a session on logout", async () => {
    const store = memoryStore();
    const result = await signupUser(store, {
      name: "Karan",
      email: "karan@example.com",
      password: "DevPassword123!",
    });
    await logoutUser(store, result.token);
    await expect(getSessionUser(store, result.token)).resolves.toBeNull();
  });

  it("creates or reuses a user for Google login", async () => {
    const store = memoryStore();
    const first = await loginWithGoogle(store, {
      email: "karan@example.com",
      name: "Karan",
    });
    expect(first.user.email).toBe("karan@example.com");
    const second = await loginWithGoogle(store, {
      email: "karan@example.com",
      name: "Karan B",
    });
    expect(second.user.id).toBe(first.user.id);
  });
});
