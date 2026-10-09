// sized for one 1-hour study block: a forgotten problem fails fast (Again,
// read the solution, re-solve tomorrow), a remembered one is a ~15 min solve.
export const DEFAULT_DAILY_REVIEW_COUNT = 3;

const DAY_SECONDS = 24 * 60 * 60;
const FRESH_PROBLEM_THRESHOLD_DAYS = 3;

export type DailyReviewPlanCandidate = {
	cardId: string;
	createdAt: number;
	reps: number;
	// FSRS probability of recall right now, 0 for never-reviewed cards
	retrievability: number;
};

export type DailyReviewPlanSummary = {
	dailyReviewCount: number;
	plannedCount: number;
	reviewQueueCount: number;
	waitingCount: number;
};

/**
 * Picks today's Daily Review Plan from the Review Queue.
 *
 * Fresh Problems (added in the last few days, never reviewed) come first so a
 * problem solved yesterday gets re-solved from memory today. Everything else
 * goes by retrievability, highest first: problems you're about to forget are
 * worth more than problems already forgotten, which the backlog reaches later.
 */
export function buildDailyReviewPlan<
	TCandidate extends DailyReviewPlanCandidate,
>({
	reviewQueue,
	nowUnix,
	dailyReviewCount = DEFAULT_DAILY_REVIEW_COUNT,
}: {
	reviewQueue: readonly TCandidate[];
	nowUnix: number;
	dailyReviewCount?: number;
}) {
	const planSize = Math.max(0, Math.floor(dailyReviewCount));
	const cards = reviewQueue
		.map((candidate) => ({
			candidate,
			isFresh: isFreshProblem(candidate, nowUnix),
		}))
		.sort(
			(left, right) =>
				Number(right.isFresh) - Number(left.isFresh) ||
				right.candidate.retrievability - left.candidate.retrievability ||
				left.candidate.cardId.localeCompare(right.candidate.cardId),
		)
		.slice(0, planSize)
		.map(({ candidate }) => candidate);

	return {
		cards,
		summary: {
			dailyReviewCount: planSize,
			plannedCount: cards.length,
			reviewQueueCount: reviewQueue.length,
			waitingCount: reviewQueue.length - cards.length,
		} satisfies DailyReviewPlanSummary,
	};
}

function isFreshProblem(candidate: DailyReviewPlanCandidate, nowUnix: number) {
	const ageDays = Math.floor(
		(startOfUtcDayUnix(nowUnix) - startOfUtcDayUnix(candidate.createdAt)) /
			DAY_SECONDS,
	);
	return candidate.reps === 0 && ageDays <= FRESH_PROBLEM_THRESHOLD_DAYS;
}

/**
 * Floors any Unix timestamp to midnight UTC so planner behavior is time-zone stable.
 */
function startOfUtcDayUnix(unix: number) {
	const date = new Date(unix * 1000);
	return Math.floor(
		Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) /
			1000,
	);
}
