export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required. Set it in your environment variables.`);
  }
  return value;
}

export function getDatabaseUrl(): string {
  const url = requireEnv("DATABASE_URL");
  if (url.startsWith("file:")) {
    throw new Error(
      "DATABASE_URL is still using SQLite (file:...). For Coolify/Supabase you must set a PostgreSQL connection string.",
    );
  }
  return url;
}