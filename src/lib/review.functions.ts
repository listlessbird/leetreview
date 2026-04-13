import { z } from "zod";

export type DueCard = {
	cardId: string;
	due: number;
	title: string;
	difficulty: string;
	tags: string[];
	url: string;
};

export type ProblemRow = {
	problemId: string;
	cardId: string;
	title: string;
	slug: string;
	difficulty: string;
	tags: string[];
	url: string;
	due: number;
	reps: number;
};

export type ReviewCard = {
	cardId: string;
	title: string;
	difficulty: string;
	tags: string[];
	url: string;
};

export const reviewQueryKeys = {
	dueCards: ["due-cards"] as const,
	problems: ["problems"] as const,
	reviewCard: (cardId: string) => ["review-card", cardId] as const,
};

const addProblemInput = z.object({
	url: z.string().url(),
});

const reviewInput = z.object({
	cardId: z.string().min(1),
	rating: z.number().int().min(1).max(4),
});

const cardIdInput = z.object({
	cardId: z.string().min(1),
});

async function readErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	try {
		const payload = (await response.json()) as { error?: string };
		return payload.error ?? fallback;
	} catch {
		return fallback;
	}
}

export async function fetchDueCards() {
	const response = await fetch("/api/due-cards");

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Could not load due cards."),
		);
	}

	return (await response.json()) as DueCard[];
}

export async function fetchProblems() {
	const response = await fetch("/api/problems");

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Could not load problems."),
		);
	}

	return (await response.json()) as ProblemRow[];
}

export async function fetchReviewCard(cardId: string) {
	cardIdInput.parse({ cardId });
	const response = await fetch(`/api/review/${cardId}`);

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Could not load review card."),
		);
	}

	return (await response.json()) as ReviewCard;
}

export async function addProblemFromUrl({ data }: { data: { url: string } }) {
	const body = addProblemInput.parse(data);
	const response = await fetch("/api/problems", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(await readErrorMessage(response, "Could not add problem."));
	}

	return (await response.json()) as {
		cardId: string;
		created: boolean;
	};
}

export async function submitReview({
	data,
}: {
	data: { cardId: string; rating: number };
}) {
	cardIdInput.parse({ cardId: data.cardId });
	const body = reviewInput.parse(data);
	const response = await fetch(`/api/review/${body.cardId}`, {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify({ rating: body.rating }),
	});

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Failed to submit review."),
		);
	}

	return (await response.json()) as { ok: true };
}
