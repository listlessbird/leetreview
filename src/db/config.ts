import path from "node:path";

export type DatabaseMode = "local" | "d1-http";

export type DatabaseEnv = {
	DATABASE_MODE?: string;
	LOCAL_SQLITE_PATH?: string;
	CLOUDFLARE_ACCOUNT_ID?: string;
	CLOUDFLARE_DATABASE_ID?: string;
	CLOUDFLARE_D1_TOKEN?: string;
	D1_ACCOUNT_ID?: string;
	D1_DATABASE_ID?: string;
	D1_API_TOKEN?: string;
	NODE_ENV?: string;
};

export type CloudflareD1Config = {
	accountId: string;
	databaseId: string;
	token: string;
};

const DEFAULT_LOCAL_SQLITE_PATH = path.join(
	process.cwd(),
	"data",
	"dev.sqlite",
);

function readValue(value: string | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export function resolveDatabaseMode(env: DatabaseEnv): DatabaseMode {
	const configuredMode = readValue(env.DATABASE_MODE);

	if (configuredMode === "local" || configuredMode === "d1-http") {
		return configuredMode;
	}

	if (configuredMode) {
		throw new Error(
			`Unsupported DATABASE_MODE "${configuredMode}". Use "local" or "d1-http".`,
		);
	}

	if (env.NODE_ENV === "production" && hasCloudflareD1Config(env)) {
		return "d1-http";
	}

	return "local";
}

export function resolveLocalSqlitePath(env: DatabaseEnv) {
	const configuredPath = readValue(env.LOCAL_SQLITE_PATH);

	if (!configuredPath) {
		return DEFAULT_LOCAL_SQLITE_PATH;
	}

	return path.resolve(
		/* turbopackIgnore: true */ process.cwd(),
		configuredPath,
	);
}

export function hasCloudflareD1Config(env: DatabaseEnv) {
	return Boolean(
		readValue(env.CLOUDFLARE_ACCOUNT_ID ?? env.D1_ACCOUNT_ID) &&
			readValue(env.CLOUDFLARE_DATABASE_ID ?? env.D1_DATABASE_ID) &&
			readValue(env.CLOUDFLARE_D1_TOKEN ?? env.D1_API_TOKEN),
	);
}

export function getCloudflareD1Config(env: DatabaseEnv): CloudflareD1Config {
	const accountId = readValue(env.CLOUDFLARE_ACCOUNT_ID ?? env.D1_ACCOUNT_ID);
	const databaseId = readValue(
		env.CLOUDFLARE_DATABASE_ID ?? env.D1_DATABASE_ID,
	);
	const token = readValue(env.CLOUDFLARE_D1_TOKEN ?? env.D1_API_TOKEN);

	if (!accountId || !databaseId || !token) {
		throw new Error(
			"Missing Cloudflare D1 credentials. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, and CLOUDFLARE_D1_TOKEN.",
		);
	}

	return {
		accountId,
		databaseId,
		token,
	};
}
