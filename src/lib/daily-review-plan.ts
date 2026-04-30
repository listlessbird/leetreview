export const DEFAULT_DAILY_REVIEW_COUNT = 12;

const DAY_SECONDS = 24 * 60 * 60;
const FRESH_PROBLEM_THRESHOLD_DAYS = 3;
const OVERDUE_PRIORITY_CAP = 45;

export type ReviewRating = 1 | 2 | 3 | 4;

export type DailyReviewPlanCandidate = {
	cardId: string;
	due: number;
	createdAt: number;
	reps: number;
	lapses: number;
	difficulty: string;
	latestRating: ReviewRating | null;
};

export type DailyReviewPlanSummary = {
	dailyReviewCount: number;
	plannedCount: number;
	reviewQueueCount: number;
	backlogCount: number;
	backlogNotPlannedCount: number;
	plannedBacklogCount: number;
	plannedDueCount: number;
	plannedNeglectedCount: number;
	plannedLowPracticeCount: number;
	plannedHighRiskCount: number;
};

type ClassifiedCandidate<TCandidate extends DailyReviewPlanCandidate> = {
	candidate: TCandidate;
	reviewPriority: number;
	overdueDays: number;
	isOverdue: boolean;
	isDueToday: boolean;
	isFresh: boolean;
	isNeglected: boolean;
	isLowPractice: boolean;
	isHighRisk: boolean;
};

type ReviewMixKey =
	| "neglected"
	| "highRisk"
	| "lowPractice"
	| "dueToday"
	| "reviewedBacklog";

type ReviewMixTarget = {
	key: ReviewMixKey;
	weight: number;
	matches: <TCandidate extends DailyReviewPlanCandidate>(
		candidate: ClassifiedCandidate<TCandidate>,
	) => boolean;
};

const REVIEW_MIX: ReviewMixTarget[] = [
	{
		key: "neglected",
		weight: 1,
		matches: (candidate) => candidate.isNeglected,
	},
	{
		key: "highRisk",
		weight: 1,
		matches: (candidate) => candidate.isHighRisk,
	},
	{
		key: "lowPractice",
		weight: 2,
		matches: (candidate) => candidate.isLowPractice,
	},
	{
		key: "dueToday",
		weight: 3,
		matches: (candidate) => candidate.isDueToday,
	},
	{
		key: "reviewedBacklog",
		weight: 5,
		matches: (candidate) => candidate.isOverdue && candidate.candidate.reps > 0,
	},
];

const DIFFICULTY_PRIORITY: Record<string, number> = {
	EASY: 0,
	MEDIUM: 10,
	HARD: 15,
};

const DIFFICULTY_RANK: Record<string, number> = {
	EASY: 1,
	MEDIUM: 2,
	HARD: 3,
};

/**
 * Builds the learner's Daily Review Plan from the full Review Queue.
 *
 * Algorithm:
 * 1. Classify each ready problem as overdue/due today, fresh/neglected,
 *    low-practice, and high-risk.
 * 2. Apply the soft Review Mix in priority order: neglected, high-risk,
 *    low-practice, due today, then reviewed backlog.
 * 3. Keep a selected-card set so a problem that matches multiple categories
 *    can satisfy only one plan slot.
 * 4. Fill remaining slots by weighted Review Priority, using stable tie-breakers.
 * 5. Return the selected cards plus summary counts; do not mutate FSRS due dates.
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
	const classified = reviewQueue.map((candidate) =>
		classifyCandidate(candidate, nowUnix),
	);
	const selected = new Map<string, ClassifiedCandidate<TCandidate>>();

	for (const target of REVIEW_MIX) {
		addMatchingCandidates({
			candidates: classified,
			selected,
			targetCount: getReviewMixTarget(planSize, target.key),
			matches: target.matches,
			planSize,
		});
	}

	addMatchingCandidates({
		candidates: classified,
		selected,
		targetCount: planSize - selected.size,
		matches: () => true,
		planSize,
	});

	const selectedCandidates = [...selected.values()];

	return {
		cards: selectedCandidates.map(({ candidate }) => candidate),
		summary: summarizePlan({
			candidates: classified,
			selectedCandidates,
			dailyReviewCount: planSize,
		}),
	};
}

/**
 * Converts raw card facts into the domain flags the planner uses for selection.
 * All date comparisons happen at UTC day granularity to match the Review Queue.
 */
function classifyCandidate<TCandidate extends DailyReviewPlanCandidate>(
	candidate: TCandidate,
	nowUnix: number,
): ClassifiedCandidate<TCandidate> {
	const todayStartUnix = startOfUtcDayUnix(nowUnix);
	const tomorrowStartUnix = todayStartUnix + DAY_SECONDS;
	const createdDayUnix = startOfUtcDayUnix(candidate.createdAt);
	const ageDays = Math.max(
		0,
		Math.floor((todayStartUnix - createdDayUnix) / DAY_SECONDS),
	);
	const isOverdue = candidate.due < todayStartUnix;
	const isDueToday =
		candidate.due >= todayStartUnix && candidate.due < tomorrowStartUnix;
	const isFresh =
		candidate.reps === 0 && ageDays <= FRESH_PROBLEM_THRESHOLD_DAYS;
	const isNeglected =
		candidate.reps === 0 && ageDays > FRESH_PROBLEM_THRESHOLD_DAYS;
	const isLowPractice = candidate.reps > 0 && candidate.reps <= 2;
	const isHighRisk =
		candidate.reps > 0 &&
		(candidate.lapses > 0 || candidate.latestRating === 1);
	const overdueDays = isOverdue
		? Math.max(1, Math.floor((todayStartUnix - candidate.due) / DAY_SECONDS))
		: 0;

	return {
		candidate,
		reviewPriority: calculateReviewPriority({
			candidate,
			overdueDays,
			isDueToday,
			isFresh,
			isNeglected,
			isLowPractice,
			isHighRisk,
		}),
		overdueDays,
		isOverdue,
		isDueToday,
		isFresh,
		isNeglected,
		isLowPractice,
		isHighRisk,
	};
}

/**
 * Scores a candidate for the final fill pass after soft Review Mix targets run.
 * Recall risk and neglected work dominate; difficulty is only a small tiebreaking signal.
 */
function calculateReviewPriority<TCandidate extends DailyReviewPlanCandidate>({
	candidate,
	overdueDays,
	isDueToday,
	isFresh,
	isNeglected,
	isLowPractice,
	isHighRisk,
}: {
	candidate: TCandidate;
	overdueDays: number;
	isDueToday: boolean;
	isFresh: boolean;
	isNeglected: boolean;
	isLowPractice: boolean;
	isHighRisk: boolean;
}) {
	let score = 0;

	if (isNeglected) score += 100;
	if (candidate.latestRating === 1) score += 80;
	if (isHighRisk && candidate.lapses > 0) score += 60;
	if (isLowPractice) score += 45;
	if (isDueToday) score += 30;
	score += Math.min(overdueDays * 3, OVERDUE_PRIORITY_CAP);
	score += DIFFICULTY_PRIORITY[candidate.difficulty.trim().toUpperCase()] ?? 0;
	if (isFresh) score -= 20;

	return score;
}

/**
 * Adds the best candidates matching one Review Mix target without exceeding the plan size.
 * The selected map enforces the invariant that each card can occupy only one slot.
 */
function addMatchingCandidates<TCandidate extends DailyReviewPlanCandidate>({
	candidates,
	selected,
	targetCount,
	matches,
	planSize,
}: {
	candidates: readonly ClassifiedCandidate<TCandidate>[];
	selected: Map<string, ClassifiedCandidate<TCandidate>>;
	targetCount: number;
	matches: (candidate: ClassifiedCandidate<TCandidate>) => boolean;
	planSize: number;
}) {
	if (targetCount <= 0 || selected.size >= planSize) return;

	let added = 0;
	for (const candidate of rankCandidates(candidates)) {
		if (selected.size >= planSize || added >= targetCount) return;
		if (selected.has(candidate.candidate.cardId) || !matches(candidate))
			continue;

		selected.set(candidate.candidate.cardId, candidate);
		added += 1;
	}
}

/**
 * Returns a fresh priority-ordered copy so each fill pass can scan candidates consistently.
 */
function rankCandidates<TCandidate extends DailyReviewPlanCandidate>(
	candidates: readonly ClassifiedCandidate<TCandidate>[],
) {
	return [...candidates].sort(compareCandidates);
}

/**
 * Orders candidates by Review Priority, then stable deterministic tie-breakers.
 * Older due dates, fewer reps, harder difficulty, and card id make refreshes predictable.
 */
function compareCandidates<TCandidate extends DailyReviewPlanCandidate>(
	left: ClassifiedCandidate<TCandidate>,
	right: ClassifiedCandidate<TCandidate>,
) {
	return (
		right.reviewPriority - left.reviewPriority ||
		left.candidate.due - right.candidate.due ||
		left.candidate.reps - right.candidate.reps ||
		getDifficultyRank(right.candidate.difficulty) -
			getDifficultyRank(left.candidate.difficulty) ||
		left.candidate.cardId.localeCompare(right.candidate.cardId)
	);
}

/**
 * Normalizes LeetCode difficulty into a numeric rank for deterministic tie-breaking.
 */
function getDifficultyRank(difficulty: string) {
	return DIFFICULTY_RANK[difficulty.trim().toUpperCase()] ?? 0;
}

/**
 * Converts Review Mix weights into an integer target for the current Daily Review Count.
 * Remainders are assigned in mix order so count 12 becomes 1/1/2/3/5 exactly.
 */
function getReviewMixTarget(dailyReviewCount: number, key: ReviewMixKey) {
	if (dailyReviewCount <= 0) return 0;

	const totalWeight = REVIEW_MIX.reduce(
		(sum, target) => sum + target.weight,
		0,
	);
	const rawTargets = REVIEW_MIX.map((target, index) => {
		const raw = (dailyReviewCount * target.weight) / totalWeight;
		const base = Math.floor(raw);

		return {
			key: target.key,
			index,
			base,
			remainder: raw - base,
		};
	});
	const remaining =
		dailyReviewCount - rawTargets.reduce((sum, target) => sum + target.base, 0);
	const bonusKeys = new Set(
		[...rawTargets]
			.sort(
				(left, right) =>
					right.remainder - left.remainder || left.index - right.index,
			)
			.slice(0, remaining)
			.map((target) => target.key),
	);
	const target = rawTargets.find((candidate) => candidate.key === key);

	return target ? target.base + (bonusKeys.has(key) ? 1 : 0) : 0;
}

/**
 * Produces dashboard-facing counts for the selected plan and remaining Backlog.
 * Counts are derived from the same classifications used for selection.
 */
function summarizePlan<TCandidate extends DailyReviewPlanCandidate>({
	candidates,
	selectedCandidates,
	dailyReviewCount,
}: {
	candidates: readonly ClassifiedCandidate<TCandidate>[];
	selectedCandidates: readonly ClassifiedCandidate<TCandidate>[];
	dailyReviewCount: number;
}): DailyReviewPlanSummary {
	const backlogCount = candidates.filter(
		(candidate) => candidate.isOverdue,
	).length;
	const plannedBacklogCount = selectedCandidates.filter(
		(candidate) => candidate.isOverdue,
	).length;

	return {
		dailyReviewCount,
		plannedCount: selectedCandidates.length,
		reviewQueueCount: candidates.length,
		backlogCount,
		backlogNotPlannedCount: Math.max(0, backlogCount - plannedBacklogCount),
		plannedBacklogCount,
		plannedDueCount: selectedCandidates.filter(
			(candidate) => candidate.isDueToday,
		).length,
		plannedNeglectedCount: selectedCandidates.filter(
			(candidate) => candidate.isNeglected,
		).length,
		plannedLowPracticeCount: selectedCandidates.filter(
			(candidate) => candidate.isLowPractice,
		).length,
		plannedHighRiskCount: selectedCandidates.filter(
			(candidate) => candidate.isHighRisk,
		).length,
	};
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
