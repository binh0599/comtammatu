import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    // Uses DIRECT_URL for CLI operations (db pull, generate, studio)
    // Falls back to DATABASE_URL if DIRECT_URL not set
    url: env("DIRECT_URL") ?? env("DATABASE_URL"),
  },
});
