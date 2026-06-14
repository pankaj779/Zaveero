import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Prefer Marble_web_site/.env over a DATABASE_URL already set in the shell (e.g. DataWhisper).
dotenv.config({ path: ".env", override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
