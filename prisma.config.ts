import { config } from "dotenv";
config({ path: ".env" });
config({ path: ".env.local", override: true });
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  ...(process.env.POSTGRES_PRISMA_URL && {
    datasource: { url: process.env.POSTGRES_PRISMA_URL },
  }),
});
