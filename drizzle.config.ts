import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import {
	getCloudflareD1Config,
	resolveDatabaseMode,
	resolveLocalSqlitePath,
} from "./src/db/config";

config({ path: [".env.local", ".env"] });

const sharedConfig = {
	out: "./drizzle",
	schema: ["./src/db/schema.ts", "./src/db/auth.schema.ts"] as string[],
};

const databaseMode = resolveDatabaseMode(process.env);

const drizzleConfig =
	databaseMode === "d1-http"
		? defineConfig({
				...sharedConfig,
				dialect: "sqlite",
				driver: "d1-http",
				dbCredentials: getCloudflareD1Config(process.env),
			})
		: defineConfig({
				...sharedConfig,
				dialect: "sqlite",
				dbCredentials: {
					url: resolveLocalSqlitePath(process.env),
				},
			});

export default drizzleConfig;
