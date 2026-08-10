import { NextResponse } from "next/server";

import { ingestDailyChallenge } from "@/server/leetcode-daily";

// the daily fetch is one request and the deploy hook is one more, but the
// upstream is unofficial and occasionally slow
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const logger = {
	info(event: Record<string, unknown>) {
		console.info(JSON.stringify(event));
	},
	error(event: Record<string, unknown>) {
		console.error(JSON.stringify(event));
	},
};

function errorInfo(error: unknown) {
	const typedError = error as Error;
	return {
		type: typedError?.name ?? "Error",
		message: typedError?.message ?? "Unknown error",
	};
}

/**
 * Daily LeetCode refresh, invoked by the Vercel cron job in vercel.json.
 *
 * Two independent jobs, deliberately not sharing a failure path:
 *  - the daily challenge is fetched and written to the database
 *  - the deploy hook is triggered, which rebuilds the site and regenerates
 *    data/leetcode-cache.json as part of the build
 */
export async function GET(request: Request) {
	const startedAt = Date.now();
	const cronSecret = process.env.CRON_SECRET;
	const authHeader = request.headers.get("authorization");

	if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	const wideEvent: Record<string, unknown> = {
		event_name: "leetcode.cron_refresh",
		timestamp: new Date(startedAt).toISOString(),
		service: "leet-review",
		runtime: "nextjs-node",
		deployment_env: process.env.NODE_ENV ?? "unknown",
		commit_hash: process.env.COMMIT_SHA ?? null,
		cron_schedule: request.headers.get("x-vercel-cron-schedule"),
	};

	let dailyOk = false;
	try {
		const { daily, created } = await ingestDailyChallenge();
		dailyOk = true;
		wideEvent.daily_outcome = "success";
		wideEvent.daily_date = daily.date;
		wideEvent.daily_slug = daily.slug;
		wideEvent.daily_created = created;
	} catch (error) {
		wideEvent.daily_outcome = "error";
		wideEvent.daily_error = errorInfo(error);
	}

	const deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL?.trim();
	let rebuildOk = false;
	if (!deployHookUrl) {
		wideEvent.rebuild_outcome = "skipped";
	} else {
		try {
			const response = await fetch(deployHookUrl, { method: "POST" });
			rebuildOk = response.ok;
			wideEvent.rebuild_outcome = response.ok ? "success" : "error";
			wideEvent.rebuild_status_code = response.status;
			if (!response.ok) {
				wideEvent.rebuild_error = {
					type: "DeployHookError",
					message: `Deploy hook returned ${response.status}`,
				};
			}
		} catch (error) {
			wideEvent.rebuild_outcome = "error";
			wideEvent.rebuild_error = errorInfo(error);
		}
	}

	// the cron job itself only fails when both halves failed; a partial run is
	// still worth reporting as a success so Vercel's log view stays meaningful
	const outcome =
		dailyOk || rebuildOk || wideEvent.rebuild_outcome === "skipped"
			? "success"
			: "error";
	wideEvent.outcome = outcome;
	wideEvent.status_code = outcome === "success" ? 200 : 500;
	wideEvent.duration_ms = Date.now() - startedAt;

	if (outcome === "success") {
		logger.info(wideEvent);
	} else {
		logger.error(wideEvent);
	}

	return NextResponse.json(
		{
			ok: outcome === "success",
			daily: wideEvent.daily_outcome,
			rebuild: wideEvent.rebuild_outcome,
		},
		{ status: outcome === "success" ? 200 : 500 },
	);
}
