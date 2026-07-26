import { createClient } from "@libsql/client";

const client = createClient({ url: "file:./dev.db" });
const rows = await client.execute(
  "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
);
console.log("TABLES:", rows.rows.map((r) => r.name).join(", "));
await client.close();
