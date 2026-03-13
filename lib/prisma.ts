import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbUrl = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  // Resolve relative file path to absolute for libsql (use forward slashes for Windows compat)
  const url = dbUrl.startsWith("file:.")
    ? `file:${path.resolve(process.cwd(), dbUrl.replace(/^file:/, "")).replace(/\\/g, "/")}`
    : dbUrl;

  // Turso remote DB requires an auth token
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const adapter = new PrismaLibSql({ url, ...(authToken ? { authToken } : {}) });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
