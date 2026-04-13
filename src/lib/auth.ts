import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { getEnv } from "../env";
import { getDb } from "../db";
import { schema } from "../db/schema";

let auth: ReturnType<typeof createAuth> | undefined;

function createAuth() {
	const env = getEnv();

	return betterAuth({
		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		database: drizzleAdapter(
			getDb(),
			{
				schema,
				provider: "sqlite",
				usePlural: true,
			},
		),
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			github: {
				clientId: env.GITHUB_CLIENT_ID,
				clientSecret: env.GITHUB_CLIENT_SECRET,
			},
		},
		advanced: {
			ipAddress: {
				ipAddressHeaders: ["cf-connecting-ip", "x-real-ip"],
			},
		},
		plugins: [nextCookies()],
		trustedOrigins: [env.BETTER_AUTH_URL],
	});
}

export async function getAuth() {
	if (!auth) {
		auth = createAuth();
	}

	return auth;
}

export async function getAuthForRequest(_request: Request) {
	return getAuth();
}
