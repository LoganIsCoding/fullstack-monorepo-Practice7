import type { PrismaClient } from "@remix-gospel-stack/database";

import type { User } from "../shared/dtos.ts";
import type { UserRepository } from "./iuser-repository.ts";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {
    this.prisma = prisma;
  }
  async getUsers(): Promise<User[]> {
    const ids = await this.prisma.user.findMany({ select: { id: true } });
    const users: User[] = [];
    for (const { id } of ids) {
      const user = await this.prisma.user.findUnique({ where: { id } });
      if (user) users.push(user);
    }
    return users;
  }

  async getUsersCount(): Promise<number> {
    return this.prisma.user.count();
  }
}
