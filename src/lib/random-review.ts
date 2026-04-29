export type ReviewPlatform = "leetcode" | "neetcode";

export type RandomReviewProblem = {
	cardId: string;
	url: string;
	neetcodeUrl: string | null;
};

export type RandomReviewSession<
	TProblem extends RandomReviewProblem = RandomReviewProblem,
> = {
	problem: TProblem;
	platform: ReviewPlatform;
	url: string;
};

export type PlatformResolution =
	| {
			type: "open";
			platform: ReviewPlatform;
			url: string;
	  }
	| {
			type: "choose";
	  };

export const RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY =
	"leetreview.randomReviewPlatformPreference.v1";

export function chooseRandomReview<TProblem extends { cardId: string }>({
	problems,
	skippedCardIds,
	random = Math.random,
}: {
	problems: readonly TProblem[];
	skippedCardIds: ReadonlySet<string>;
	random?: () => number;
}) {
	if (problems.length === 0) {
		return { problem: null, skippedReset: false };
	}

	const available = problems.filter(
		(problem) => !skippedCardIds.has(problem.cardId),
	);
	const pool = available.length > 0 ? available : problems;
	const rawRandomValue = random();
	const randomValue = Number.isFinite(rawRandomValue)
		? Math.max(0, Math.min(rawRandomValue, 0.999_999_999))
		: 0;
	const index = Math.floor(randomValue * pool.length);

	return {
		problem: pool[index] ?? null,
		skippedReset: available.length === 0 && skippedCardIds.size > 0,
	};
}

export function resolveRandomReviewPlatform({
	problem,
	preference,
}: {
	problem: RandomReviewProblem;
	preference: ReviewPlatform | null;
}): PlatformResolution {
	if (problem.neetcodeUrl && preference) {
		return {
			type: "open",
			platform: preference,
			url: getPlatformUrl(problem, preference),
		};
	}

	if (problem.neetcodeUrl) {
		return { type: "choose" };
	}

	return {
		type: "open",
		platform: "leetcode",
		url: problem.url,
	};
}

export function getPlatformUrl(
	problem: RandomReviewProblem,
	platform: ReviewPlatform,
) {
	if (platform === "neetcode") {
		return problem.neetcodeUrl ?? problem.url;
	}

	return problem.url;
}

export function isReviewPlatform(
	value: string | null,
): value is ReviewPlatform {
	return value === "leetcode" || value === "neetcode";
}
