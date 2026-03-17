import "@tanstack/react-start/server-only";

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
import { Context, Effect, Layer, Schema } from "effect";
import { nanoid } from "nanoid";
import {
	type Card,
	createEmptyCard,
	type FSRSParameters,
	fsrs,
	type Grade,
	type State,
} from "ts-fsrs";
import { DrizzleDb, drizzleDbLayer } from "@/db";
import { cards, problemResources, problems, reviewLogs } from "@/db/schema";
import { type AuthError, RequestAuth, requestAuthLayer } from "@/lib/auth";
import { SYSTEM_DESIGN_DAILY_REVIEW_LIMIT } from "@/lib/constants";
import {
	extractLeetCodeSlug,
	type LeetCodeError,
	LeetCodeGateway,
	leetCodeGatewayLayer,
} from "@/lib/leetcode.server";
import {
	formatReviewAvailabilityReason,
	getReviewAvailability,
	normalizeTags,
	PROBLEM_TYPES,
	type ProblemType,
	type ReviewAvailabilityReason,
} from "@/lib/review-policy";

class ReviewNotFoundError extends Schema.TaggedError<ReviewNotFoundError>()(
	"ReviewNotFoundError",
	{
		message: Schema.String,
	},
) {}

class ReviewValidationError extends Schema.TaggedError<ReviewValidationError>()(
	"ReviewValidationError",
	{
		message: Schema.String,
	},
) {}

class ReviewDatabaseError extends Schema.TaggedError<ReviewDatabaseError>()(
	"ReviewDatabaseError",
	{
		message: Schema.String,
		error: Schema.Defect,
	},
) {}

export type ReviewError =
	| AuthError
	| LeetCodeError
	| ReviewNotFoundError
	| ReviewValidationError
	| ReviewDatabaseError;

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

function mapProblemRow<T extends { tags: string }>(row: T) {
	return {
		...row,
		tags: JSON.parse(row.tags) as string[],
	};
}

export type DueCard = {
	cardId: string;
	due: number;
	state: number;
	slug: string;
	type: string;
	title: string;
	difficulty: string;
	tags: string[];
	url: string | null;
};

export type ProblemListItem = {
	problemId: string;
	slug: string;
	type: string;
	title: string;
	difficulty: string;
	tags: string[];
	url: string | null;
	createdAt: number;
	cardId: string;
	due: number;
	lastReview: number | null;
	state: number;
	reps: number;
	lapses: number;
	canReviewToday: boolean;
	reviewAvailabilityReason: ReviewAvailabilityReason;
};

export type ReviewResource = {
	id: string;
	url: string;
	title: string | null;
};

export type ReviewCardDetails = {
	cardId: string;
	problemId: string;
	title: string;
	slug: string;
	type: string;
	difficulty: string;
	tags: string[];
	url: string | null;
	due: number;
	lastReview: number | null;
	state: number;
	reps: number;
	lapses: number;
	canReviewToday: boolean;
	reviewAvailabilityReason: ReviewAvailabilityReason;
	resources: ReviewResource[];
};

export type AddSystemDesignProblemInput = {
	title: string;
	difficulty: "Easy" | "Medium" | "Hard";
	tags?: string[];
	resources?: { url: string; title?: string }[];
};

export class Reviews extends Context.Tag("@/backend/Reviews")<
	Reviews,
	{
		readonly getDueCards: (
			request: Request,
		) => Effect.Effect<DueCard[], ReviewError>;
		readonly listProblems: (
			request: Request,
		) => Effect.Effect<ProblemListItem[], ReviewError>;
		readonly addProblemFromUrl: (
			request: Request,
			url: string,
		) => Effect.Effect<{ cardId: string; created: boolean }, ReviewError>;
		readonly addSystemDesignProblem: (
			request: Request,
			input: AddSystemDesignProblemInput,
		) => Effect.Effect<{ cardId: string; created: boolean }, ReviewError>;
		readonly getReviewCard: (
			request: Request,
			cardId: string,
		) => Effect.Effect<ReviewCardDetails, ReviewError>;
		readonly submitReview: (
			request: Request,
			input: { cardId: string; rating: number },
		) => Effect.Effect<{ ok: true }, ReviewError>;
	}
>() {}

export const baseBackendLayer = Layer.mergeAll(
	drizzleDbLayer,
	requestAuthLayer,
	leetCodeGatewayLayer,
);

const reviewsLive = Layer.effect(
	Reviews,
	Effect.gen(function* () {
		const { db } = yield* DrizzleDb;
		const auth = yield* RequestAuth;
		const leetcode = yield* LeetCodeGateway;

		const runDb = <A>(operation: string, execute: () => Promise<A>) =>
			Effect.tryPromise({
				try: execute,
				catch: (error) =>
					ReviewDatabaseError.make({
						message: `Database operation failed: ${operation}`,
						error,
					}),
			});

		const getSystemDesignDailyContext = Effect.fn(
			"Reviews.getSystemDesignDailyContext",
		)(function* (userId: string) {
			const reviewedBefore = startOfTodayUtcUnix();
			const dueBy = endOfTodayUtcUnix();
			const reviewedUntil = startOfTomorrowUtcUnix();

			const [reviewedToday] = yield* runDb("reviewedToday", () =>
				db
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

			const eligibleRows = yield* runDb("eligibleSystemDesignCards", () =>
				db
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
							or(
								isNull(cards.lastReview),
								lt(cards.lastReview, reviewedBefore),
							),
						),
					)
					.orderBy(asc(cards.due))
					.limit(remainingBudget),
			);

			return {
				dueBy,
				reviewedBefore,
				reviewedTodayCount,
				remainingBudget,
				eligibleCardIds: new Set(eligibleRows.map((row) => row.cardId)),
			};
		});

		const getDueCards = Effect.fn("Reviews.getDueCards")(function* (
			request: Request,
		) {
			const userId = yield* auth.requireUserId(request);
			const dueBy = endOfTodayUtcUnix();
			const reviewedBefore = startOfTodayUtcUnix();
			const systemDesignContext = yield* getSystemDesignDailyContext(userId);

			const rows = yield* runDb("getDueCards", () =>
				db
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
							or(
								isNull(cards.lastReview),
								lt(cards.lastReview, reviewedBefore),
							),
						),
					)
					.orderBy(asc(cards.due)),
			);

			return rows
				.filter(
					(row) =>
						row.type !== PROBLEM_TYPES.SYSTEM_DESIGN ||
						systemDesignContext.eligibleCardIds.has(row.cardId),
				)
				.map(mapProblemRow);
		});

		const listProblems = Effect.fn("Reviews.listProblems")(function* (
			request: Request,
		) {
			const userId = yield* auth.requireUserId(request);
			const systemDesignContext = yield* getSystemDesignDailyContext(userId);

			const rows = yield* runDb("listProblems", () =>
				db
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
					.orderBy(desc(problems.createdAt)),
			);

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
		});

		const addProblemFromUrl = Effect.fn("Reviews.addProblemFromUrl")(function* (
			request: Request,
			url: string,
		) {
			const userId = yield* auth.requireUserId(request);
			const slug = yield* Effect.try({
				try: () => extractLeetCodeSlug(url),
				catch: (error) =>
					ReviewValidationError.make({
						message:
							error instanceof Error
								? error.message
								: "Invalid LeetCode problem URL.",
					}),
			});

			const existing = yield* runDb("findExistingProblem", () =>
				db
					.select({ cardId: cards.id })
					.from(problems)
					.innerJoin(cards, eq(cards.problemId, problems.id))
					.where(and(eq(problems.userId, userId), eq(problems.slug, slug)))
					.limit(1),
			);

			if (existing[0]) {
				return { cardId: existing[0].cardId, created: false } as const;
			}

			const metadata = yield* leetcode.fetchQuestion(slug);
			const problemId = nanoid();
			const cardId = nanoid();
			const ts = nowUnix();
			const baseCard = createSeededCard(metadata.difficulty);

			yield* runDb("insertProblem", () =>
				db.insert(problems).values({
					id: problemId,
					userId,
					slug,
					type: PROBLEM_TYPES.LEETCODE,
					title: metadata.title,
					difficulty: metadata.difficulty,
					tags: JSON.stringify(normalizeTags(metadata.tags)),
					url,
					createdAt: ts,
				}),
			);

			yield* runDb("insertCard", () =>
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
			);

			return { cardId, created: true } as const;
		});

		const addSystemDesignProblem = Effect.fn("Reviews.addSystemDesignProblem")(
			function* (request: Request, input: AddSystemDesignProblemInput) {
				const userId = yield* auth.requireUserId(request);
				const problemId = nanoid();
				const cardId = nanoid();
				const ts = nowUnix();
				const slug = `sd-${nanoid(10)}`;
				const baseCard = createSeededCard(input.difficulty);
				const resources =
					input.resources?.map((resource, index) => ({
						id: nanoid(),
						problemId,
						url: resource.url,
						title: resource.title?.trim() || null,
						sortOrder: index,
						createdAt: ts,
					})) ?? [];

				yield* runDb("insertSystemDesignProblem", () =>
					db.insert(problems).values({
						id: problemId,
						userId,
						slug,
						type: PROBLEM_TYPES.SYSTEM_DESIGN,
						title: input.title,
						difficulty: input.difficulty,
						tags: JSON.stringify(normalizeTags(input.tags)),
						url: null,
						createdAt: ts,
					}),
				);

				if (resources.length > 0) {
					yield* runDb("insertProblemResources", () =>
						db.insert(problemResources).values(resources),
					);
				}

				yield* runDb("insertSystemDesignCard", () =>
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
				);

				return { cardId, created: true } as const;
			},
		);

		const getReviewCard = Effect.fn("Reviews.getReviewCard")(function* (
			request: Request,
			cardId: string,
		) {
			const userId = yield* auth.requireUserId(request);
			const systemDesignContext = yield* getSystemDesignDailyContext(userId);

			const rows = yield* runDb("getReviewCard", () =>
				db
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
					.where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
					.limit(1),
			);

			const row = rows[0];
			if (!row) {
				return yield* ReviewNotFoundError.make({
					message: "Card not found.",
				});
			}

			const resources =
				row.type === PROBLEM_TYPES.SYSTEM_DESIGN
					? yield* runDb("getReviewResources", () =>
							db
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
								),
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

		const submitReview = Effect.fn("Reviews.submitReview")(function* (
			request: Request,
			input: { cardId: string; rating: number },
		) {
			const userId = yield* auth.requireUserId(request);
			const systemDesignContext = yield* getSystemDesignDailyContext(userId);

			const current = yield* runDb("loadReviewCardState", () =>
				db
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
					.where(and(eq(cards.id, input.cardId), eq(cards.userId, userId)))
					.limit(1),
			);

			const existing = current[0];
			if (!existing) {
				return yield* ReviewNotFoundError.make({
					message: "Card not found.",
				});
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
				return yield* ReviewValidationError.make({
					message: formatReviewAvailabilityReason(
						availability.reviewAvailabilityReason ?? "daily-cap",
					),
				});
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
				...(existing.lastReview
					? {
							last_review: new Date(existing.lastReview * 1000),
						}
					: {}),
			};

			const scheduler = fsrs(FSRS_CONFIG);
			const effectiveReviewUnix = Math.max(nowUnix(), existing.due);
			const next = scheduler.next(
				fsrsCard,
				new Date(effectiveReviewUnix * 1000),
				input.rating as Grade,
			);
			const nextCard = next.card;
			const reviewLog = next.log;

			yield* runDb("updateCardAfterReview", () =>
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
			);

			yield* runDb("insertReviewLog", () =>
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
				}),
			);

			return { ok: true } as const;
		});

		return Reviews.of({
			getDueCards,
			listProblems,
			addProblemFromUrl,
			addSystemDesignProblem,
			getReviewCard,
			submitReview,
		});
	}),
);

export const reviewsLayer = reviewsLive.pipe(Layer.provide(baseBackendLayer));
