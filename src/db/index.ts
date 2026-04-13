import "server-only";
import Database from "better-sqlite3";
import type {
	AsyncBatchRemoteCallback,
	AsyncRemoteCallback,
	SqliteRemoteDatabase,
} from "drizzle-orm/sqlite-proxy";
import { drizzle } from "drizzle-orm/sqlite-proxy";

import { getEnv } from "@/env";

import {
	getCloudflareD1Config,
	resolveDatabaseMode,
	resolveLocalSqlitePath,
} from "./config";
import { schema } from "./schema";

type D1Error = {
	message?: string;
};

type D1RawResult = {
	success?: boolean;
	results?: {
		rows?: unknown[][];
	};
};

type D1RawResponse = {
	success?: boolean;
	errors?: D1Error[];
	result?: D1RawResult[];
};

let db: SqliteRemoteDatabase<typeof schema> | undefined;
let localDatabase: Database.Database | undefined;

function getLocalDatabase() {
	if (!localDatabase) {
		localDatabase = new Database(resolveLocalSqlitePath(getEnv()));
	}

	return localDatabase;
}

function getD1Endpoint() {
	const { accountId, databaseId } = getCloudflareD1Config(getEnv());
	return `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/raw`;
}

function formatD1Errors(errors: D1Error[] | undefined) {
	const messages = errors
		?.map((error) => error.message?.trim())
		.filter(Boolean);

	return messages?.length ? messages.join("; ") : null;
}

async function executeD1Raw(
	body:
		| { sql: string; params?: unknown[] }
		| { batch: { sql: string; params?: unknown[] }[] },
) {
	const { token } = getCloudflareD1Config(getEnv());
	const response = await fetch(getD1Endpoint(), {
		method: "POST",
		headers: {
			authorization: `Bearer ${token}`,
			"content-type": "application/json",
		},
		cache: "no-store",
		body: JSON.stringify(body),
	});

	const responseText = await response.text();
	let payload: D1RawResponse | undefined;
	try {
		payload = responseText
			? (JSON.parse(responseText) as D1RawResponse)
			: undefined;
	} catch {
		payload = undefined;
	}

	const errorMessage =
		formatD1Errors(payload?.errors) ||
		(response.ok ? null : responseText.trim()) ||
		`D1 API request failed with status ${response.status}.`;

	if (!response.ok || !payload?.success) {
		throw new Error(errorMessage ?? "D1 API request failed.");
	}

	return payload.result ?? [];
}

function toProxyRows(
	result: D1RawResult | undefined,
	method: "run" | "all" | "values" | "get",
) {
	if (!result?.success) {
		throw new Error("D1 query failed.");
	}

	const rows = result.results?.rows ?? [];
	if (method === "get") {
		return { rows: rows[0] ?? [] };
	}

	return { rows };
}

function executeLocalQuery(
	sql: string,
	params: unknown[] | undefined,
	method: "run" | "all" | "values" | "get",
) {
	const statement = getLocalDatabase().prepare(sql);
	const args = params ?? [];

	if (method === "run") {
		statement.run(...args);
		return { rows: [] };
	}

	if (method === "get") {
		const row = statement.raw(true).get(...args);
		return { rows: (row as unknown[]) ?? [] };
	}

	const rows = statement.raw(true).all(...args);
	return { rows: rows as unknown[][] };
}

const localSingleQueryCallback: AsyncRemoteCallback = async (
	sql,
	params,
	method,
) => executeLocalQuery(sql, params, method);

const localBatchQueryCallback: AsyncBatchRemoteCallback = async (queries) =>
	getLocalDatabase().transaction(() =>
		queries.map(({ sql, params, method }) =>
			executeLocalQuery(sql, params, method),
		),
	)();

const remoteSingleQueryCallback: AsyncRemoteCallback = async (
	sql,
	params,
	method,
) => {
	const [result] = await executeD1Raw({ sql, params });
	return toProxyRows(result, method);
};

const remoteBatchQueryCallback: AsyncBatchRemoteCallback = async (queries) => {
	const results = await executeD1Raw({
		batch: queries.map(({ sql, params }) => ({ sql, params })),
	});

	return results.map((result, index) =>
		toProxyRows(result, queries[index]?.method ?? "all"),
	);
};

export function getDb() {
	if (!db) {
		const databaseMode = resolveDatabaseMode(getEnv());
		db =
			databaseMode === "d1-http"
				? drizzle(remoteSingleQueryCallback, remoteBatchQueryCallback, {
						schema,
					})
				: drizzle(localSingleQueryCallback, localBatchQueryCallback, {
						schema,
					});
	}

	return db;
}
