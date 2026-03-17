import { env as workerEnv } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import { Context, Layer } from "effect";

import { schema } from "./schema.ts";

function getD1Binding() {
	const d1 = workerEnv?.DB;
	if (!d1) {
		throw new Error(
			'Missing D1 binding "DB". Add d1_databases.DB in wrangler.jsonc.',
		);
	}
	return d1;
}

export const db = drizzle(getD1Binding(), { schema });

export class DrizzleDb extends Context.Tag("@/db/DrizzleDb")<
	DrizzleDb,
	{
		readonly db: typeof db;
	}
>() {}

export const drizzleDbLayer = Layer.succeed(DrizzleDb, { db });
