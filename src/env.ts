import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

function buildEnv() {
	return createEnv({
		server: {
			BETTER_AUTH_URL: z.string().url(),
			BETTER_AUTH_SECRET: z.string().min(1),
			GITHUB_CLIENT_ID: z.string().min(1),
			GITHUB_CLIENT_SECRET: z.string().min(1),
			NODE_ENV: z.enum(["development", "test", "production"]).optional(),
			DATABASE_MODE: z.enum(["local", "d1-http"]).optional(),
			LOCAL_SQLITE_PATH: z.string().min(1).optional(),
			CLOUDFLARE_ACCOUNT_ID: z.string().min(1).optional(),
			CLOUDFLARE_DATABASE_ID: z.string().min(1).optional(),
			CLOUDFLARE_D1_TOKEN: z.string().min(1).optional(),
			D1_ACCOUNT_ID: z.string().min(1).optional(),
			D1_DATABASE_ID: z.string().min(1).optional(),
			D1_API_TOKEN: z.string().min(1).optional(),
		},
		clientPrefix: "NEXT_PUBLIC_",
		client: {
			NEXT_PUBLIC_APP_TITLE: z.string().min(1).optional(),
		},
		runtimeEnv: process.env,
		emptyStringAsUndefined: true,
	});
}

let cachedEnv: ReturnType<typeof buildEnv> | undefined;

export function getEnv() {
	if (!cachedEnv) {
		cachedEnv = buildEnv();
	}

	return cachedEnv;
}
