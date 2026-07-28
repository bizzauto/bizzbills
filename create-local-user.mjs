import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import { config } from "dotenv";

config(); // Load .env file

const DATABASE_URL = process.env.DATABASE_URL || "file:./dev.db";

// Use libsql adapter for SQLite/local dev only
const adapter = new PrismaLibSql({
  url: DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

if (!DATABASE_URL.startsWith("file:")) {
  throw new Error("create-local-user.mjs is intended for SQLite local dev only. Use create-user.mjs for PostgreSQL/Supabase.");
}

const email = "sandydarekar01@gmail.com";
const password = "sandydarekar01@123";

const salt = crypto.randomBytes(32).toString("hex");
const key = await new Promise((res, rej) => {
  crypto.pbkdf2(password, salt, 210000, 64, "sha512", (e, d) => e ? rej(e) : res(d.toString("hex")));
});
const passwordHash = salt + ":" + key;

const existing = await prisma.user.findUnique({ where: { email } });
if (existing) {
  console.log("User exists, updating password...");
  await prisma.user.update({ where: { email }, data: { passwordHash } });
} else {
  await prisma.user.create({
    data: { email, name: "Sandy Darekar", passwordHash },
  });
}

const user = await prisma.user.findUnique({ where: { email } });
console.log("✅ User ID:", user.id);
console.log("✅ Email:", user.email);
console.log("✅ Password set:", !!user.passwordHash);
await prisma.$disconnect();