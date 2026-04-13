import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { searchLeetCodeProblemsImpl } from "@/lib/leetcode.server";

const searchInput = z.object({
	query: z.string().trim().min(1).max(300),
});

const logger = {
	info(event: Record<string, unknown>) {
		console.info(JSON.stringify(event));
	},
	error(event: Record<string, unknown>) {
		console.error(JSON.stringify(event));
	},
};

export async function POST(request: Request) {
	const startedAt = Date.now();
	const requestId =
		request.headers.get("cf-ray") ??
		request.headers.get("x-request-id") ??
		crypto.randomUUID();

	const wideEvent: Record<string, unknown> = {
		event_name: "leetcode.search",
		timestamp: new Date(startedAt).toISOString(),
		request_id: requestId,
		service: "leet-review",
		runtime: "nextjs-node",
		deployment_env: process.env.NODE_ENV ?? "unknown",
		commit_hash: process.env.COMMIT_SHA ?? null,
		method: request.method,
		path: new URL(request.url).pathname,
	};

	try {
		const { query } = searchInput.parse(await request.json());
		wideEvent.search_query_length = query.length;

		const execution = await searchLeetCodeProblemsImpl(query);
		wideEvent.outcome = "success";
		wideEvent.status_code = 200;
		wideEvent.search_path = execution.meta.path;
		wideEvent.cache_hit = execution.meta.cache_hit;
		wideEvent.upstream_status_code = execution.meta.upstream_status_code;
		wideEvent.result_count = execution.meta.result_count;

		return NextResponse.json(execution.results);
	} catch (error) {
		const typedError = error as Error;
		wideEvent.outcome = "error";
		wideEvent.status_code = error instanceof ZodError ? 400 : 500;
		wideEvent.error = {
			type: typedError?.name ?? "Error",
			message: typedError?.message ?? "Unknown error",
		};

		return NextResponse.json(
			{
				error: typedError?.message ?? "Could not search problems.",
			},
			{ status: error instanceof ZodError ? 400 : 500 },
		);
	} finally {
		wideEvent.duration_ms = Date.now() - startedAt;
		if (wideEvent.outcome === "error") {
			logger.error(wideEvent);
		} else {
			logger.info(wideEvent);
		}
	}
}
