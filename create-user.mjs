import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "node:crypto";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required");
}
const adapter = new PrismaPg({ connectionString: url });
const prisma = new PrismaClient({ adapter });

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
