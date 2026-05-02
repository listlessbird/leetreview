import { z } from "zod";
import type { DailyReviewPlanSummary } from "@/lib/daily-review-plan";

export type DueCard = {
	cardId: string;
	problemId: string;
	due: number;
	title: string;
	difficulty: string;
	tags: string[];
	url: string;
	neetcodeUrl: string | null;
};

export type DueCardsResponse = {
	cards: DueCard[];
	summary: DailyReviewPlanSummary;
};

export type ProblemRow = {
	problemId: string;
	cardId: string;
	title: string;
	slug: string;
	difficulty: string;
	tags: string[];
	url: string;
	neetcodeUrl: string | null;
	due: number;
	reps: number;
};

export type ReviewCard = {
	cardId: string;
	problemId: string;
	title: string;
	difficulty: string;
	tags: string[];
	url: string;
	neetcodeUrl: string | null;
};

export type UpdateProblemMetaInput = {
	url: string;
	neetcodeUrl: string | null;
	tags: string[];
};

export type UpdatedProblemMeta = {
	problemId: string;
	url: string;
	neetcodeUrl: string | null;
	tags: string[];
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

const updateProblemInput = z.object({
	url: z.string().url(),
	neetcodeUrl: z.string().url().nullable(),
	tags: z.array(z.string().min(1)).max(50),
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

	return (await response.json()) as DueCardsResponse;
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

export async function updateProblem({
	problemId,
	data,
}: {
	problemId: string;
	data: UpdateProblemMetaInput;
}) {
	const body = updateProblemInput.parse(data);
	const response = await fetch(`/api/problems/${problemId}`, {
		method: "PATCH",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Could not update problem."),
		);
	}

	return (await response.json()) as UpdatedProblemMeta;
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
