import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { and, asc, desc, eq, isNull, lt, lte, or } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
	type Card,
	createEmptyCard,
	fsrs,
	type Grade,
	type State,
} from "ts-fsrs";
import { z } from "zod";
import { db } from "@/db";
import { cards, problems, reviewLogs } from "@/db/schema";
import { getAuthForRequest } from "@/lib/auth";
import {
	extractLeetCodeSlug,
	fetchLeetCodeQuestion,
} from "@/lib/leetcode.server";

const addProblemInput = z.object({
	url: z.url(),
});

const reviewInput = z.object({
	cardId: z.string().min(1),
	rating: z.number().int().min(1).max(4),
});

const cardIdInput = z.object({
	cardId: z.string().min(1),
});

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

async function getCurrentUserId() {
	const request = getRequest();
	const auth = await getAuthForRequest(request);
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}
	return session.user.id;
}

export const getDueCards = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getCurrentUserId();
		const dueBy = endOfTodayUtcUnix();
		const reviewedBefore = startOfTodayUtcUnix();

		const rows = await db
			.select({
				cardId: cards.id,
				due: cards.due,
				state: cards.state,
				slug: problems.slug,
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

		return rows.map((row) => ({
			...row,
			tags: JSON.parse(row.tags) as string[],
		}));
	},
);

export const listProblems = createServerFn({ method: "GET" }).handler(
	async () => {
		const userId = await getCurrentUserId();

		const rows = await db
			.select({
				problemId: problems.id,
				slug: problems.slug,
				title: problems.title,
				difficulty: problems.difficulty,
				tags: problems.tags,
				url: problems.url,
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
		const baseCard = createEmptyCard(new Date());

		await db.insert(problems).values({
			id: problemId,
			userId,
			slug,
			title: metadata.title,
			difficulty: metadata.difficulty,
			tags: JSON.stringify(metadata.tags),
			url: data.url,
			createdAt: ts,
		});

		await db.insert(cards).values({
			id: cardId,
			userId,
			problemId,
			due: ts,
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
		const rows = await db
			.select({
				cardId: cards.id,
				problemId: problems.id,
				title: problems.title,
				slug: problems.slug,
				difficulty: problems.difficulty,
				tags: problems.tags,
				url: problems.url,
				due: cards.due,
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

		return {
			...row,
			tags: JSON.parse(row.tags) as string[],
		};
	});

export const submitReview = createServerFn({ method: "POST" })
	.inputValidator((data) => reviewInput.parse(data))
	.handler(async ({ data }) => {
		const userId = await getCurrentUserId();
		const current = await db
			.select()
			.from(cards)
			.where(and(eq(cards.id, data.cardId), eq(cards.userId, userId)))
			.limit(1);

		const existing = current[0];
		if (!existing) {
			throw new Error("Card not found.");
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

		const scheduler = fsrs({
			enable_short_term: false,
			learning_steps: [],
			relearning_steps: [],
		});
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
