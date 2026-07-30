// Bypass Prisma — use libsql directly to create a user
import { createClient } from "@libsql/client";
import crypto from "node:crypto";
import { readFileSync, existsSync } from "node:fs";

// Load .env manually
const envPath = new URL(".env", import.meta.url).pathname;
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[t.slice(0, i).trim()] ??= v;
  }
}

const url = process.env.DATABASE_URL || "file:./dev.db";
const libsql = createClient({ url });

const email = "sandydarekar01@gmail.com";
const password = "sandydarekar01@123";

const salt = crypto.randomBytes(32).toString("hex");
const key = await new Promise((res, rej) => {
  crypto.pbkdf2(password, salt, 210000, 64, "sha512", (e, d) => e ? rej(e) : res(d.toString("hex")));
});
const hash = salt + ":" + key;

// Check if user exists
const existing = await libsql.execute({
  sql: "SELECT id FROM \"User\" WHERE email = ?",
  args: [email],
});

let userId;
if (existing.rows.length > 0) {
  console.log("User exists, updating password...");
  await libsql.execute({
    sql: "UPDATE \"User\" SET \"passwordHash\" = ? WHERE email = ?",
    args: [hash, email],
  });
  userId = existing.rows[0].id;
} else {
  const result = await libsql.execute({
    sql: "INSERT INTO \"User\" (id, email, name, \"passwordHash\", \"createdAt\", \"updatedAt\") VALUES (?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING id",
    args: [crypto.randomUUID(), email, "Sandy Darekar", hash],
  });
  userId = result.rows[0].id;
}

console.log("✅ User ID:", userId);
console.log("✅ Email:", email);
console.log("✅ Password set:", !!hash);

// Verify the user exists
const check = await libsql.execute({
  sql: "SELECT id, email, name FROM \"User\" WHERE email = ?",
  args: [email],
});
console.log("✅ Verified:", JSON.stringify(check.rows[0]));

await libsql.close();
