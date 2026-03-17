import { SYSTEM_DESIGN_DAILY_REVIEW_LIMIT } from "@/lib/constants";

export const PROBLEM_TYPES = {
	LEETCODE: "leetcode",
	SYSTEM_DESIGN: "system-design",
} as const;

export type ProblemType = (typeof PROBLEM_TYPES)[keyof typeof PROBLEM_TYPES];

export type ReviewAvailabilityReason =
	| "not-due"
	| "reviewed-today"
	| "daily-cap"
	| null;

export function normalizeTags(tags: string[] | undefined): string[] {
	const seen = new Set<string>();
	const normalized: string[] = [];

	for (const tag of tags ?? []) {
		const trimmed = tag.trim();
		if (!trimmed) {
			continue;
		}

		const lookup = trimmed.toLowerCase();
		if (seen.has(lookup)) {
			continue;
		}

		seen.add(lookup);
		normalized.push(trimmed);
	}

	return normalized;
}

export function formatReviewAvailabilityReason(
	reason: Exclude<ReviewAvailabilityReason, null>,
): string {
	if (reason === "not-due") {
		return "This system design card is not due yet.";
	}
	if (reason === "reviewed-today") {
		return "This system design card was already reviewed today.";
	}
	return `You can review at most ${SYSTEM_DESIGN_DAILY_REVIEW_LIMIT} system design cards per UTC day.`;
}

export function getReviewAvailability({
	type,
	cardId,
	due,
	lastReview,
	dueBy,
	reviewedBefore,
	eligibleSystemDesignCardIds,
}: {
	type: ProblemType;
	cardId: string;
	due: number;
	lastReview: number | null;
	dueBy: number;
	reviewedBefore: number;
	eligibleSystemDesignCardIds: ReadonlySet<string>;
}): {
	canReviewToday: boolean;
	reviewAvailabilityReason: ReviewAvailabilityReason;
} {
	if (type !== PROBLEM_TYPES.SYSTEM_DESIGN) {
		return {
			canReviewToday: true,
			reviewAvailabilityReason: null,
		};
	}

	if (due > dueBy) {
		return {
			canReviewToday: false,
			reviewAvailabilityReason: "not-due",
		};
	}

	if (lastReview !== null && lastReview >= reviewedBefore) {
		return {
			canReviewToday: false,
			reviewAvailabilityReason: "reviewed-today",
		};
	}

	if (!eligibleSystemDesignCardIds.has(cardId)) {
		return {
			canReviewToday: false,
			reviewAvailabilityReason: "daily-cap",
		};
	}

	return {
		canReviewToday: true,
		reviewAvailabilityReason: null,
	};
}
