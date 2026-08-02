/**
 * Seed script: Create Super Admin user
 *
 * Usage:
 *   ADMIN_EMAIL=bizzautoai@gmail.com ADMIN_PASSWORD=yourpass npx tsx scripts/seed-super-admin.ts
 *
 * Required env vars:
 *   ADMIN_EMAIL    — super admin email
 *   ADMIN_PASSWORD — super admin password
 *   DATABASE_URL   — PostgreSQL connection string (from .env)
 */

import crypto from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const SUPER_ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const SUPER_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SUPER_ADMIN_NAME = "BizzAuto Super Admin";

if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_PASSWORD) {
  console.error("❌ Missing required env vars: ADMIN_EMAIL, ADMIN_PASSWORD");
  console.error("   Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npx tsx scripts/seed-super-admin.ts");
  process.exit(1);
}

// Password hashing — same as src/lib/password.ts
const SALT_LENGTH = 32;
const KEY_LENGTH = 64;
const HASH_ALGO = "sha512";
const ITERATIONS = 210000;

function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      ITERATIONS,
      KEY_LENGTH,
      HASH_ALGO,
      (err, derivedKey) => {
        if (err) reject(err);
        else resolve(`${salt}:${derivedKey.toString("hex")}`);
      }
    );
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("❌ DATABASE_URL environment variable is not set");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString: url });
  const prisma = new PrismaClient({ adapter });

  try {
    // Check if user already exists
    const existing = await prisma.user.findUnique({
      where: { email: SUPER_ADMIN_EMAIL },
    });

    if (existing) {
      console.log(`⚠️  User ${SUPER_ADMIN_EMAIL} already exists (id: ${existing.id})`);

      // Update role to SUPER_ADMIN if not already
      if (existing.role !== "SUPER_ADMIN") {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: "SUPER_ADMIN" },
        });
        console.log(`✅ Role updated to SUPER_ADMIN`);
      } else {
        console.log(`ℹ️  Role is already SUPER_ADMIN`);
      }
      return;
    }

    // Hash password
    const passwordHash = await hashPassword(SUPER_ADMIN_PASSWORD);

    // Create super admin (no org — platform-level admin)
    const user = await prisma.user.create({
      data: {
        name: SUPER_ADMIN_NAME,
        email: SUPER_ADMIN_EMAIL,
        passwordHash,
        role: "SUPER_ADMIN",
        emailVerified: new Date(), // Auto-verified
      },
    });

    console.log("✅ Super Admin created successfully!");
    console.log(`   ID:    ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role:  ${user.role}`);
    console.log(`   Name:  ${user.name}`);
  } catch (error) {
    console.error("❌ Failed to create Super Admin:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
