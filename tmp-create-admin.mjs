import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import crypto from "node:crypto";

const adapter = new PrismaLibSql({ url: "file:./dev.db" });
const prisma = new PrismaClient({ adapter });

const password = "Admin@123456";
const salt = crypto.randomBytes(32).toString("hex");
const key = await new Promise((res, rej) =>
  crypto.pbkdf2(password, salt, 210000, 64, "sha512", (e, d) =>
    e ? rej(e) : res(d.toString("hex")),
  ),
);
const passwordHash = salt + ":" + key;

try {
  const existing = await prisma.user.findUnique({
    where: { email: "admin@billinvoice.com" },
  });
  if (existing) {
    await prisma.user.update({
      where: { email: "admin@billinvoice.com" },
      data: { passwordHash },
    });
    console.log("EXISTS -> password updated");
  } else {
    const user = await prisma.user.create({
      data: { email: "admin@billinvoice.com", name: "Admin", passwordHash },
    });
    console.log("CREATED id:", user.id);
  }
  const check = await prisma.user.findUnique({
    where: { email: "admin@billinvoice.com" },
  });
  console.log("VERIFY passwordHash set:", !!check.passwordHash);
} catch (e) {
  console.error("REAL ERROR:", e);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
