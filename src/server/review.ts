import "server-only";

import { and, asc, desc, eq, isNull, lt, lte, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
	type Card,
	createEmptyCard,
	type FSRSParameters,
	fsrs,
	type Grade,
	type State,
} from "ts-fsrs";

import { getDb } from "@/db";
import { cards, problems, reviewLogs } from "@/db/schema";
import {
	buildDailyReviewPlan,
	DEFAULT_DAILY_REVIEW_COUNT,
} from "@/lib/daily-review-plan";
import {
	extractLeetCodeSlug,
	fetchLeetCodeQuestion,
} from "@/lib/leetcode.server";
import { getNeetcodeUrl } from "@/lib/neetcode.server";
import type { SolveLanguage } from "@/lib/rating";
import { getSessionFromHeaders } from "@/server/session";

// tuned for a full-time-job budget where each review is a 15-25 min re-solve:
// - 0.85 retention gives ~3x longer intervals than 0.93, so the daily load
//   fits one study block.
// - the 1-day (re)learning step is the stuck rule: anything rated Again (or a
//   brand-new problem rated Again) comes back tomorrow to be re-solved from
//   memory, instead of FSRS's post-lapse interval of up to a week.
// - 45 days caps how long a problem can go unseen; a success after a long
//   break otherwise jumps straight to months. pull it toward 30 before
//   interviews.
const FSRS_CONFIG: Partial<FSRSParameters> = {
	request_retention: 0.85,
	maximum_interval: 45,
	enable_fuzz: true,
	enable_short_term: true,
	learning_steps: ["1d"],
	relearning_steps: ["1d"],
};

const scheduler = fsrs(FSRS_CONFIG);

type CardRow = typeof cards.$inferSelect;

function toFsrsCard(row: CardRow): Card {
	return {
		due: new Date(row.due * 1000),
		stability: row.stability,
		difficulty: row.difficulty,
		elapsed_days: row.elapsedDays,
		scheduled_days: row.scheduledDays,
		learning_steps: row.learningSteps,
		reps: row.reps,
		lapses: row.lapses,
		state: row.state as State,
		last_review: row.lastReview ? new Date(row.lastReview * 1000) : undefined,
	};
}

function nowUnix() {
	return Math.floor(Date.now() / 1000);
}

function endOfTodayUtcUnix() {
	const now = new Date();
	const nextUtcMidnightSeconds = Math.floor(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) /
			1000,
	);
	return nextUtcMidnightSeconds - 1;
}

function startOfTodayUtcUnix() {
	const now = new Date();
	return Math.floor(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000,
	);
}

function startOfTomorrowUtcUnix() {
	const now = new Date();
	return Math.floor(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) /
			1000,
	);
}

async function getCurrentUserId(requestHeaders: Headers) {
	const session = await getSessionFromHeaders(requestHeaders);
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}

	return session.user.id;
}

export async function getDueCards(requestHeaders: Headers) {
	const userId = await getCurrentUserId(requestHeaders);
	const dueBy = endOfTodayUtcUnix();
	const reviewedBefore = startOfTodayUtcUnix();
	const now = new Date();
	const db = await getDb();

	const rows = await db
		.select({
			card: cards,
			problemId: problems.id,
			slug: problems.slug,
			title: problems.title,
			difficulty: problems.difficulty,
			tags: problems.tags,
			url: problems.url,
			neetcodeUrl: problems.neetcodeUrl,
			notes: problems.notes,
			createdAt: problems.createdAt,
		})
		.from(cards)
		.innerJoin(problems, eq(cards.problemId, problems.id))
		.where(
			and(
				eq(cards.userId, userId),
				lte(cards.due, dueBy),
				or(isNull(cards.lastReview), lt(cards.lastReview, reviewedBefore)),
			),
		)
		.orderBy(asc(cards.due));

	const reviewQueue = rows.map(({ card, ...problem }) => ({
		...problem,
		cardId: card.id,
		due: card.due,
		state: card.state,
		reps: card.reps,
		tags: JSON.parse(problem.tags) as string[],
		retrievability:
			card.reps === 0
				? 0
				: scheduler.get_retrievability(toFsrsCard(card), now, false),
	}));
	const plan = buildDailyReviewPlan({
		reviewQueue,
		nowUnix: Math.floor(now.getTime() / 1000),
		dailyReviewCount: DEFAULT_DAILY_REVIEW_COUNT,
	});

	return {
		cards: plan.cards,
		reviewQueueCards: reviewQueue,
		summary: plan.summary,
	};
}

export async function listProblems(requestHeaders: Headers) {
	const userId = await getCurrentUserId(requestHeaders);
	const db = await getDb();

	const rows = await db
		.select({
			problemId: problems.id,
			slug: problems.slug,
			title: problems.title,
			difficulty: problems.difficulty,
			tags: problems.tags,
			url: problems.url,
			neetcodeUrl: problems.neetcodeUrl,
			notes: problems.notes,
			createdAt: problems.createdAt,
			cardId: cards.id,
			due: cards.due,
			state: cards.state,
			reps: cards.reps,
			lapses: cards.lapses,
		})
		.from(problems)
		.innerJoin(cards, eq(cards.problemId, problems.id))
		.where(eq(problems.userId, userId))
		.orderBy(desc(problems.createdAt));

	return rows.map((row) => ({
		...row,
		tags: JSON.parse(row.tags) as string[],
	}));
}

export async function updateProblemMeta(
	requestHeaders: Headers,
	problemId: string,
	input: {
		url: string;
		neetcodeUrl: string | null;
		notes: string | null;
		tags: string[];
	},
) {
	const userId = await getCurrentUserId(requestHeaders);
	const db = await getDb();

	const existing = await db
		.select({ id: problems.id })
		.from(problems)
		.where(and(eq(problems.id, problemId), eq(problems.userId, userId)))
		.limit(1);

	if (!existing[0]) {
		throw new Error("Problem not found.");
	}

	await db
		.update(problems)
		.set({
			url: input.url,
			neetcodeUrl: input.neetcodeUrl,
			notes: input.notes,
			tags: JSON.stringify(input.tags),
		})
		.where(eq(problems.id, problemId));

	return {
		problemId,
		url: input.url,
		neetcodeUrl: input.neetcodeUrl,
		notes: input.notes,
		tags: input.tags,
	};
}

export async function addProblemFromUrl(requestHeaders: Headers, url: string) {
	const userId = await getCurrentUserId(requestHeaders);
	const slug = extractLeetCodeSlug(url);
	const db = await getDb();

	const existing = await db
		.select({ cardId: cards.id })
		.from(problems)
		.innerJoin(cards, eq(cards.problemId, problems.id))
		.where(and(eq(problems.userId, userId), eq(problems.slug, slug)))
		.limit(1);

	if (existing[0]) {
		return { cardId: existing[0].cardId, created: false };
	}

	const metadata = await fetchLeetCodeQuestion(slug);
	const neetcodeUrl = await getNeetcodeUrl(slug);
	const problemId = nanoid();
	const cardId = nanoid();
	const ts = nowUnix();
	const baseCard = createEmptyCard(new Date());

	await db.batch([
		db.insert(problems).values({
			id: problemId,
			userId,
			slug,
			title: metadata.title,
			difficulty: metadata.difficulty,
			tags: JSON.stringify(metadata.tags),
			url,
			neetcodeUrl,
			createdAt: ts,
		}),
		db.insert(cards).values({
			id: cardId,
			userId,
			problemId,
			due: startOfTomorrowUtcUnix(),
			stability: baseCard.stability,
			difficulty: baseCard.difficulty,
			elapsedDays: baseCard.elapsed_days,
			scheduledDays: baseCard.scheduled_days,
			learningSteps: baseCard.learning_steps,
			reps: baseCard.reps,
			lapses: baseCard.lapses,
			state: baseCard.state,
			lastReview: null,
		}),
	]);

	return { cardId, created: true };
}

export async function getReviewCard(requestHeaders: Headers, cardId: string) {
	const userId = await getCurrentUserId(requestHeaders);
	const db = await getDb();

	const rows = await db
		.select({
			cardId: cards.id,
			problemId: problems.id,
			title: problems.title,
			slug: problems.slug,
			difficulty: problems.difficulty,
			tags: problems.tags,
			url: problems.url,
			neetcodeUrl: problems.neetcodeUrl,
			notes: problems.notes,
			due: cards.due,
			state: cards.state,
			reps: cards.reps,
			lapses: cards.lapses,
		})
		.from(cards)
		.innerJoin(problems, eq(cards.problemId, problems.id))
		.where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
		.limit(1);

	const row = rows[0];
	if (!row) {
		throw new Error("Card not found.");
	}

	return {
		...row,
		tags: JSON.parse(row.tags) as string[],
	};
}

export async function submitReview(
	requestHeaders: Headers,
	{
		cardId,
		rating,
		language,
	}: {
		cardId: string;
		rating: number;
		language?: SolveLanguage;
	},
) {
	const userId = await getCurrentUserId(requestHeaders);
	const db = await getDb();
	const current = await db
		.select()
		.from(cards)
		.where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
		.limit(1);

	const existing = current[0];
	if (!existing) {
		throw new Error("Card not found.");
	}

	const effectiveReviewUnix = Math.max(nowUnix(), existing.due);
	const next = scheduler.next(
		toFsrsCard(existing),
		new Date(effectiveReviewUnix * 1000),
		rating as Grade,
	);
	const nextCard = next.card;
	const reviewLog = next.log;

	await db.batch([
		db
			.update(cards)
			.set({
				due: Math.floor(nextCard.due.getTime() / 1000),
				stability: nextCard.stability,
				difficulty: nextCard.difficulty,
				elapsedDays: nextCard.elapsed_days,
				scheduledDays: nextCard.scheduled_days,
				learningSteps: nextCard.learning_steps,
				reps: nextCard.reps,
				lapses: nextCard.lapses,
				state: nextCard.state,
				lastReview: nextCard.last_review
					? Math.floor(nextCard.last_review.getTime() / 1000)
					: null,
			})
			.where(eq(cards.id, existing.id)),
		db.insert(reviewLogs).values({
			id: nanoid(),
			cardId: existing.id,
			userId,
			rating: reviewLog.rating,
			state: reviewLog.state,
			due: Math.floor(reviewLog.due.getTime() / 1000),
			stability: reviewLog.stability,
			difficulty: reviewLog.difficulty,
			elapsedDays: reviewLog.elapsed_days,
			lastElapsedDays: reviewLog.last_elapsed_days,
			scheduledDays: reviewLog.scheduled_days,
			learningSteps: reviewLog.learning_steps,
			review: Math.floor(reviewLog.review.getTime() / 1000),
			language,
		}),
	]);

	return { ok: true };
}
