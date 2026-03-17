import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { z } from "zod";
import {
	type AddSystemDesignProblemInput,
	type DueCard,
	type ProblemListItem,
	type ReviewCardDetails,
	Reviews,
	reviewsLayer,
} from "@/backend/reviews";
import { runBackendEffect } from "@/backend/runtime";

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

export const getDueCards = createServerFn({ method: "GET" }).handler(() => {
	const request = getRequest();
	return runBackendEffect(
		Effect.flatMap(Reviews, (reviews) => reviews.getDueCards(request)).pipe(
			Effect.provide(reviewsLayer),
		),
	) as Promise<DueCard[]>;
});

export const listProblems = createServerFn({ method: "GET" }).handler(() => {
	const request = getRequest();
	return runBackendEffect(
		Effect.flatMap(Reviews, (reviews) => reviews.listProblems(request)).pipe(
			Effect.provide(reviewsLayer),
		),
	) as Promise<ProblemListItem[]>;
});

export const addProblemFromUrl = createServerFn({ method: "POST" })
	.inputValidator((data) => addProblemInput.parse(data))
	.handler(({ data }) => {
		const request = getRequest();
		return runBackendEffect(
			Effect.flatMap(Reviews, (reviews) =>
				reviews.addProblemFromUrl(request, data.url),
			).pipe(Effect.provide(reviewsLayer)),
		);
	});

export const addSystemDesignProblem = createServerFn({ method: "POST" })
	.inputValidator((data) => systemDesignProblemInput.parse(data))
	.handler(({ data }) => {
		const request = getRequest();
		const input: AddSystemDesignProblemInput = {
			title: data.title,
			difficulty: data.difficulty,
			...(data.tags ? { tags: data.tags } : {}),
			...(data.resources
				? {
						resources: data.resources.map((resource) => ({
							url: resource.url,
							...(resource.title ? { title: resource.title } : {}),
						})),
					}
				: {}),
		};
		return runBackendEffect(
			Effect.flatMap(Reviews, (reviews) =>
				reviews.addSystemDesignProblem(request, input),
			).pipe(Effect.provide(reviewsLayer)),
		);
	});

export const getReviewCard = createServerFn({ method: "GET" })
	.inputValidator((data) => cardIdInput.parse(data))
	.handler(({ data }) => {
		const request = getRequest();
		return runBackendEffect(
			Effect.flatMap(Reviews, (reviews) =>
				reviews.getReviewCard(request, data.cardId),
			).pipe(Effect.provide(reviewsLayer)),
		) as Promise<ReviewCardDetails>;
	});

export const submitReview = createServerFn({ method: "POST" })
	.inputValidator((data) => reviewInput.parse(data))
	.handler(({ data }) => {
		const request = getRequest();
		return runBackendEffect(
			Effect.flatMap(Reviews, (reviews) =>
				reviews.submitReview(request, data),
			).pipe(Effect.provide(reviewsLayer)),
		);
	});
