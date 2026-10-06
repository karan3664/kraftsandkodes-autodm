import { prisma } from "@kdl/db";
import type { AuthStore, AuthUser } from "./service";

function toUser(user: {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,
  };
}

export const prismaAuthStore: AuthStore = {
  async findUserByEmail(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toUser(user) : null;
  },
  async createUser(input) {
    const user = await prisma.user.create({ data: input });
    return toUser(user);
  },
  async createSession(input) {
    await prisma.session.create({ data: input });
  },
  async findSession(tokenHash) {
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!session) {
      return null;
    }
    return {
      tokenHash: session.tokenHash,
      userId: session.userId,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    };
  },
  async deleteSession(tokenHash) {
    await prisma.session.deleteMany({ where: { tokenHash } });
  },
};
