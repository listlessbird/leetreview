import "server-only";

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { dailyChallenges } from "@/db/schema";

const GRAPHQL_URL = "https://leetcode.com/graphql/";

const DAILY_QUERY = `
	query questionOfToday {
		activeDailyCodingChallengeQuestion {
			date
			link
			question {
				questionFrontendId
				title
				titleSlug
				difficulty
				topicTags {
					name
				}
			}
		}
	}
`;

type DailyChallengeResponse = {
	data?: {
		activeDailyCodingChallengeQuestion?: {
			date: string;
			link: string;
			question: {
				questionFrontendId: string | null;
				title: string;
				titleSlug: string;
				difficulty: string;
				topicTags: { name: string }[];
			};
		} | null;
	};
};

export type DailyChallenge = {
	date: string;
	slug: string;
	title: string;
	frontendId: string | null;
	difficulty: string;
	tags: string[];
	url: string;
};

export async function fetchDailyChallenge(): Promise<DailyChallenge> {
	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			referer: "https://leetcode.com",
		},
		// the daily changes at 00:00 UTC and this only ever runs from the cron
		// job, so there is nothing to gain from a cached response
		cache: "no-store",
		body: JSON.stringify({ query: DAILY_QUERY }),
	});

	if (!response.ok) {
		throw new Error(`LeetCode API returned ${response.status}`);
	}

	const payload = (await response.json()) as DailyChallengeResponse;
	const daily = payload.data?.activeDailyCodingChallengeQuestion;

	if (!daily?.question) {
		throw new Error("Unexpected response shape from LeetCode");
	}

	return {
		date: daily.date,
		slug: daily.question.titleSlug,
		title: daily.question.title,
		frontendId: daily.question.questionFrontendId,
		// the daily query reports Easy/Medium/Hard, the problemset index
		// reports EASY/MEDIUM/HARD
		difficulty: daily.question.difficulty.trim().toUpperCase(),
		tags: daily.question.topicTags.map((tag) => tag.name),
		url: `https://leetcode.com/problems/${daily.question.titleSlug}/`,
	};
}

/**
 * Fetches today's daily challenge and stores it. Safe to run more than once a
 * day: the row is keyed by date, so a repeat run overwrites rather than
 * duplicates.
 */
export async function ingestDailyChallenge(): Promise<{
	daily: DailyChallenge;
	created: boolean;
}> {
	const daily = await fetchDailyChallenge();
	const db = getDb();

	const existing = await db
		.select({ date: dailyChallenges.date })
		.from(dailyChallenges)
		.where(eq(dailyChallenges.date, daily.date))
		.limit(1);

	await db
		.insert(dailyChallenges)
		.values({
			date: daily.date,
			slug: daily.slug,
			title: daily.title,
			frontendId: daily.frontendId,
			difficulty: daily.difficulty,
			tags: JSON.stringify(daily.tags),
			url: daily.url,
			ingestedAt: Math.floor(Date.now() / 1000),
		})
		.onConflictDoUpdate({
			target: dailyChallenges.date,
			set: {
				slug: daily.slug,
				title: daily.title,
				frontendId: daily.frontendId,
				difficulty: daily.difficulty,
				tags: JSON.stringify(daily.tags),
				url: daily.url,
				ingestedAt: Math.floor(Date.now() / 1000),
			},
		});

	return { daily, created: existing.length === 0 };
}

function toDailyChallenge(row: {
	date: string;
	slug: string;
	title: string;
	frontendId: string | null;
	difficulty: string;
	tags: string;
	url: string;
}): DailyChallenge {
	return {
		date: row.date,
		slug: row.slug,
		title: row.title,
		frontendId: row.frontendId,
		difficulty: row.difficulty,
		tags: JSON.parse(row.tags) as string[],
		url: row.url,
	};
}

/** The most recently ingested daily, or a specific date when given one. */
export async function getDailyChallenge(
	date?: string,
): Promise<DailyChallenge | null> {
	const db = getDb();
	const query = db
		.select({
			date: dailyChallenges.date,
			slug: dailyChallenges.slug,
			title: dailyChallenges.title,
			frontendId: dailyChallenges.frontendId,
			difficulty: dailyChallenges.difficulty,
			tags: dailyChallenges.tags,
			url: dailyChallenges.url,
		})
		.from(dailyChallenges);

	const rows = date
		? await query.where(eq(dailyChallenges.date, date)).limit(1)
		: await query.orderBy(desc(dailyChallenges.date)).limit(1);

	return rows[0] ? toDailyChallenge(rows[0]) : null;
}
