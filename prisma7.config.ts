// Prisma 7 CLI configuration.
//
// The connection URL lives here rather than in schema.prisma, because
// Prisma 7 no longer accepts a `url` inside the datasource block.
//
// Prisma does not read .env by itself, which is why dotenv is imported
// on the first line. Without it every CLI command would see an
// undefined DATABASE_URL.
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // Run with: npx prisma@7 db seed
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // LOCAL ONLY, on purpose. This file never reads a production url, so
    // a plain `npx prisma@7 db push` can only ever touch the local
    // database. Pushing to production is a different command with a
    // different config file: see prisma-prod.config.ts.
    url: process.env["DATABASE_URL"],
  },
});
