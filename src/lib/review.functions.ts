import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import {
	and,
	asc,
	countDistinct,
	desc,
	eq,
	gte,
	isNull,
	lt,
	lte,
	or,
} from "drizzle-orm";
import { nanoid } from "nanoid";
import {
	type Card,
	createEmptyCard,
	type FSRSParameters,
	fsrs,
	type Grade,
	type State,
} from "ts-fsrs";
import { z } from "zod";
import { db } from "@/db";
import { cards, problemResources, problems, reviewLogs } from "@/db/schema";
import { getAuthForRequest } from "@/lib/auth";
import {
	extractLeetCodeSlug,
	fetchLeetCodeQuestion,
} from "@/lib/leetcode.server";
import {
	formatReviewAvailabilityReason,
	getReviewAvailability,
	normalizeTags,
	PROBLEM_TYPES,
	type ProblemType,
} from "@/lib/review-policy";
import { SYSTEM_DESIGN_DAILY_REVIEW_LIMIT } from "@/lib/constants";

const addProblemInput = z.object({
	url: z.url(),
});

const systemDesignResourceInput = z.object({
	url: z.url(),
	title: z.string().trim().max(200).optional(),
});

const systemDesignProblemInput = z.object({
	title: z.string().trim().min(1).max(200),
	difficulty: z.enum(["Easy", "Medium", "Hard"]),
	tags: z.array(z.string()).optional(),
	resources: z.array(systemDesignResourceInput).optional(),
});

const reviewInput = z.object({
	cardId: z.string().min(1),
	rating: z.number().int().min(1).max(4),
});

const cardIdInput = z.object({
	cardId: z.string().min(1),
});

const FSRS_CONFIG: Partial<FSRSParameters> = {
	request_retention: 0.93,
	maximum_interval: 45,
	enable_fuzz: true,
	enable_short_term: false,
	learning_steps: [],
	relearning_steps: [],
};

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

function createSeededCard(problemDifficulty: string): Card {
	return seedCardByProblemDifficulty(
		createEmptyCard(new Date()),
		problemDifficulty,
	);
}

function seedCardByProblemDifficulty(
	card: Card,
	problemDifficulty: string,
): Card {
	const normalized = problemDifficulty.trim().toLowerCase();

	// FSRS difficulty is memory-difficulty (1-10), not LeetCode label.
	if (normalized === "hard") {
		return {
			...card,
			difficulty: 7.5,
			stability: 0.2,
		};
	}
	if (normalized === "medium") {
		return {
			...card,
			difficulty: 6.0,
			stability: 0.3,
		};
	}
	if (normalized === "easy") {
		return {
			...card,
			difficulty: 4.5,
			stability: 0.5,
		};
	}
	return card;
}

async function getCurrentUserId() {
	const request = getRequest();
	const auth = await getAuthForRequest(request);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

async function getSystemDesignDailyContext(userId: string) {
	const reviewedBefore = startOfTodayUtcUnix();
	const dueBy = endOfTodayUtcUnix();
	const reviewedUntil = startOfTomorrowUtcUnix();

	const [reviewedToday] = await db
		.select({
			count: countDistinct(reviewLogs.cardId),
		})
		.from(reviewLogs)
		.innerJoin(cards, eq(reviewLogs.cardId, cards.id))
		.innerJoin(problems, eq(cards.problemId, problems.id))
		.where(
			and(
				eq(reviewLogs.userId, userId),
				eq(problems.type, PROBLEM_TYPES.SYSTEM_DESIGN),
				gte(reviewLogs.review, reviewedBefore),
				lt(reviewLogs.review, reviewedUntil),
			),
		);

	const reviewedTodayCount = Number(reviewedToday?.count ?? 0);
	const remainingBudget = Math.max(
		0,
		SYSTEM_DESIGN_DAILY_REVIEW_LIMIT - reviewedTodayCount,
	);

	if (remainingBudget === 0) {
		return {
			dueBy,
			reviewedBefore,
			reviewedTodayCount,
			remainingBudget,
			eligibleCardIds: new Set<string>(),
		};
	}

	const eligibleRows = await db
		.select({
			cardId: cards.id,
		})
		.from(cards)
		.innerJoin(problems, eq(cards.problemId, problems.id))
		.where(
			and(
				eq(cards.userId, userId),
				eq(problems.type, PROBLEM_TYPES.SYSTEM_DESIGN),
				lte(cards.due, dueBy),
				or(isNull(cards.lastReview), lt(cards.lastReview, reviewedBefore)),
			),
		)
		.orderBy(asc(cards.due))
		.limit(remainingBudget);

	return {
		dueBy,
		reviewedBefore,
		reviewedTodayCount,
		remainingBudget,
		eligibleCardIds: new Set(eligibleRows.map((row) => row.cardId)),
	};
}

function mapProblemRow<T extends { tags: string }>(row: T) {
	return {
		...row,
		tags: JSON.parse(row.tags) as string[],
	};
}

export const getDueCards = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getCurrentUserId();
		const dueBy = endOfTodayUtcUnix();
		const reviewedBefore = startOfTodayUtcUnix();
		const systemDesignContext = await getSystemDesignDailyContext(userId);

		const rows = await db
			.select({
				cardId: cards.id,
				due: cards.due,
				state: cards.state,
				slug: problems.slug,
				type: problems.type,
				title: problems.title,
				difficulty: problems.difficulty,
				tags: problems.tags,
				url: problems.url,
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

		return rows
			.filter(
				(row) =>
					row.type !== PROBLEM_TYPES.SYSTEM_DESIGN ||
					systemDesignContext.eligibleCardIds.has(row.cardId),
			)
			.map(mapProblemRow);
	},
);

export const listProblems = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getCurrentUserId();
		const systemDesignContext = await getSystemDesignDailyContext(userId);

		const rows = await db
			.select({
				problemId: problems.id,
				slug: problems.slug,
				type: problems.type,
				title: problems.title,
				difficulty: problems.difficulty,
				tags: problems.tags,
				url: problems.url,
				createdAt: problems.createdAt,
				cardId: cards.id,
				due: cards.due,
				lastReview: cards.lastReview,
				state: cards.state,
				reps: cards.reps,
				lapses: cards.lapses,
			})
			.from(problems)
			.innerJoin(cards, eq(cards.problemId, problems.id))
			.where(eq(problems.userId, userId))
			.orderBy(desc(problems.createdAt));

		return rows.map((row) => {
			const availability = getReviewAvailability({
				type: row.type as ProblemType,
				cardId: row.cardId,
				due: row.due,
				lastReview: row.lastReview,
				dueBy: systemDesignContext.dueBy,
				reviewedBefore: systemDesignContext.reviewedBefore,
				eligibleSystemDesignCardIds: systemDesignContext.eligibleCardIds,
			});

			return {
				...mapProblemRow(row),
				...availability,
			};
		});
	},
);

export const addProblemFromUrl = createServerFn({ method: "POST" })
	.inputValidator((data) => addProblemInput.parse(data))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const slug = extractLeetCodeSlug(data.url);

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
		const problemId = nanoid();
		const cardId = nanoid();
		const ts = nowUnix();
		const baseCard = createSeededCard(metadata.difficulty);

		await db.insert(problems).values({
			id: problemId,
			userId,
			slug,
			type: PROBLEM_TYPES.LEETCODE,
			title: metadata.title,
			difficulty: metadata.difficulty,
			tags: JSON.stringify(normalizeTags(metadata.tags)),
			url: data.url,
			createdAt: ts,
		});

		await db.insert(cards).values({
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
		});

		return { cardId, created: true };
	});

export const addSystemDesignProblem = createServerFn({ method: "POST" })
	.inputValidator((data) => systemDesignProblemInput.parse(data))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const problemId = nanoid();
		const cardId = nanoid();
		const ts = nowUnix();
		const slug = `sd-${nanoid(10)}`;
		const baseCard = createSeededCard(data.difficulty);
		const resources =
			data.resources?.map((resource, index) => ({
				id: nanoid(),
				problemId,
				url: resource.url,
				title: resource.title?.trim() || null,
				sortOrder: index,
				createdAt: ts,
			})) ?? [];

		await db.insert(problems).values({
			id: problemId,
			userId,
			slug,
			type: PROBLEM_TYPES.SYSTEM_DESIGN,
			title: data.title,
			difficulty: data.difficulty,
			tags: JSON.stringify(normalizeTags(data.tags)),
			url: null,
			createdAt: ts,
		});

		if (resources.length > 0) {
			await db.insert(problemResources).values(resources);
		}

		await db.insert(cards).values({
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
		});

		return { cardId, created: true };
	});

export const getReviewCard = createServerFn({ method: "GET" })
	.inputValidator((data) => cardIdInput.parse(data))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const systemDesignContext = await getSystemDesignDailyContext(userId);
		const rows = await db
			.select({
				cardId: cards.id,
				problemId: problems.id,
				title: problems.title,
				slug: problems.slug,
				type: problems.type,
				difficulty: problems.difficulty,
				tags: problems.tags,
				url: problems.url,
				due: cards.due,
				lastReview: cards.lastReview,
				state: cards.state,
				reps: cards.reps,
				lapses: cards.lapses,
			})
			.from(cards)
			.innerJoin(problems, eq(cards.problemId, problems.id))
			.where(and(eq(cards.id, data.cardId), eq(cards.userId, userId)))
			.limit(1);

		const row = rows[0];
		if (!row) {
			throw new Error("Card not found.");
		}

		const resources =
			row.type === PROBLEM_TYPES.SYSTEM_DESIGN
				? await db
						.select({
							id: problemResources.id,
							url: problemResources.url,
							title: problemResources.title,
						})
						.from(problemResources)
						.where(eq(problemResources.problemId, row.problemId))
						.orderBy(
							asc(problemResources.sortOrder),
							asc(problemResources.createdAt),
						)
				: [];

		const availability = getReviewAvailability({
			type: row.type as ProblemType,
			cardId: row.cardId,
			due: row.due,
			lastReview: row.lastReview,
			dueBy: systemDesignContext.dueBy,
			reviewedBefore: systemDesignContext.reviewedBefore,
			eligibleSystemDesignCardIds: systemDesignContext.eligibleCardIds,
		});

		return {
			...mapProblemRow(row),
			...availability,
			resources,
		};
	});

export const submitReview = createServerFn({ method: "POST" })
	.inputValidator((data) => reviewInput.parse(data))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const systemDesignContext = await getSystemDesignDailyContext(userId);
		const current = await db
			.select({
				id: cards.id,
				due: cards.due,
				stability: cards.stability,
				difficulty: cards.difficulty,
				elapsedDays: cards.elapsedDays,
				scheduledDays: cards.scheduledDays,
				learningSteps: cards.learningSteps,
				reps: cards.reps,
				lapses: cards.lapses,
				state: cards.state,
				lastReview: cards.lastReview,
				type: problems.type,
			})
			.from(cards)
			.innerJoin(problems, eq(cards.problemId, problems.id))
			.where(and(eq(cards.id, data.cardId), eq(cards.userId, userId)))
			.limit(1);

		const existing = current[0];
		if (!existing) {
			throw new Error("Card not found.");
		}

		const availability = getReviewAvailability({
			type: existing.type as ProblemType,
			cardId: existing.id,
			due: existing.due,
			lastReview: existing.lastReview,
			dueBy: systemDesignContext.dueBy,
			reviewedBefore: systemDesignContext.reviewedBefore,
			eligibleSystemDesignCardIds: systemDesignContext.eligibleCardIds,
		});

		if (
			existing.type === PROBLEM_TYPES.SYSTEM_DESIGN &&
			!availability.canReviewToday
		) {
			throw new Error(
				formatReviewAvailabilityReason(
					availability.reviewAvailabilityReason ?? "daily-cap",
				),
			);
		}

		const fsrsCard: Card = {
			due: new Date(existing.due * 1000),
			stability: existing.stability,
			difficulty: existing.difficulty,
			elapsed_days: existing.elapsedDays,
			scheduled_days: existing.scheduledDays,
			learning_steps: existing.learningSteps,
			reps: existing.reps,
			lapses: existing.lapses,
			state: existing.state as State,
			last_review: existing.lastReview
				? new Date(existing.lastReview * 1000)
				: undefined,
		};

		const scheduler = fsrs(FSRS_CONFIG);
		const effectiveReviewUnix = Math.max(nowUnix(), existing.due);
		const next = scheduler.next(
			fsrsCard,
			new Date(effectiveReviewUnix * 1000),
			data.rating as Grade,
		);
		const nextCard = next.card;
		const reviewLog = next.log;

		await db
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
			.where(eq(cards.id, existing.id));

		await db.insert(reviewLogs).values({
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
		});

		return { ok: true };
	});
