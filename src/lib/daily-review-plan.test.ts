import { describe, expect, it } from "vitest";
import {
	buildDailyReviewPlan,
	type DailyReviewPlanCandidate,
} from "./daily-review-plan";

const NOW_UNIX = Date.UTC(2026, 3, 29, 12) / 1000;
const TODAY_UNIX = Date.UTC(2026, 3, 29) / 1000;
const DAY_SECONDS = 24 * 60 * 60;

function candidate(
	cardId: string,
	overrides: Partial<DailyReviewPlanCandidate> = {},
): DailyReviewPlanCandidate {
	return {
		cardId,
		due: TODAY_UNIX,
		createdAt: TODAY_UNIX - 10 * DAY_SECONDS,
		reps: 3,
		lapses: 0,
		difficulty: "Medium",
		latestRating: 3,
		...overrides,
	};
}

describe("buildDailyReviewPlan", () => {
	it("caps the Daily Review Plan and reports Backlog left outside the plan", () => {
		const reviewQueue = Array.from({ length: 14 }, (_, index) =>
			candidate(`card-${index}`, {
				due: TODAY_UNIX - (index + 1) * DAY_SECONDS,
			}),
		);

		const plan = buildDailyReviewPlan({
			reviewQueue,
			nowUnix: NOW_UNIX,
			dailyReviewCount: 12,
		});

		expect(plan.cards).toHaveLength(12);
		expect(plan.summary).toMatchObject({
			dailyReviewCount: 12,
			plannedCount: 12,
			reviewQueueCount: 14,
			backlogCount: 14,
			backlogNotPlannedCount: 2,
		});
	});

	it("returns the full Review Queue when it fits under the Daily Review Count", () => {
		const reviewQueue = [
			candidate("card-1"),
			candidate("card-2"),
			candidate("card-3"),
		];

		const plan = buildDailyReviewPlan({
			reviewQueue,
			nowUnix: NOW_UNIX,
			dailyReviewCount: 12,
		});

		expect(plan.cards.map((card) => card.cardId)).toEqual([
			"card-1",
			"card-2",
			"card-3",
		]);
		expect(plan.summary.plannedCount).toBe(3);
	});

	it("distinguishes Fresh Problems from Neglected Problems at the three-day threshold", () => {
		const plan = buildDailyReviewPlan({
			reviewQueue: [
				candidate("fresh", {
					createdAt: TODAY_UNIX - 3 * DAY_SECONDS,
					reps: 0,
				}),
				candidate("neglected", {
					createdAt: TODAY_UNIX - 4 * DAY_SECONDS,
					reps: 0,
				}),
			],
			nowUnix: NOW_UNIX,
			dailyReviewCount: 2,
		});

		expect(plan.cards.map((card) => card.cardId)).toEqual([
			"neglected",
			"fresh",
		]);
		expect(plan.summary.plannedNeglectedCount).toBe(1);
	});

	it("selects each problem only once when categories overlap", () => {
		const overlapping = candidate("overlap", {
			due: TODAY_UNIX - 5 * DAY_SECONDS,
			reps: 2,
			lapses: 1,
			latestRating: 1,
		});

		const plan = buildDailyReviewPlan({
			reviewQueue: [overlapping],
			nowUnix: NOW_UNIX,
			dailyReviewCount: 12,
		});

		expect(plan.cards.map((card) => card.cardId)).toEqual(["overlap"]);
		expect(plan.summary).toMatchObject({
			plannedCount: 1,
			plannedBacklogCount: 1,
			plannedLowPracticeCount: 1,
			plannedHighRiskCount: 1,
		});
	});

	it("protects Due Problems when Backlog is large", () => {
		const backlog = Array.from({ length: 12 }, (_, index) =>
			candidate(`backlog-${index}`, {
				due: TODAY_UNIX - (index + 1) * DAY_SECONDS,
				reps: 4,
			}),
		);
		const dueToday = Array.from({ length: 3 }, (_, index) =>
			candidate(`due-${index}`, {
				due: TODAY_UNIX,
				reps: 4,
			}),
		);

		const plan = buildDailyReviewPlan({
			reviewQueue: [...backlog, ...dueToday],
			nowUnix: NOW_UNIX,
			dailyReviewCount: 12,
		});

		expect(plan.summary.plannedDueCount).toBe(3);
		expect(plan.cards.map((card) => card.cardId)).toEqual(
			expect.arrayContaining(["due-0", "due-1", "due-2"]),
		);
	});

	it("prioritizes latest Again and lapsed problems as High-Risk Problems", () => {
		const plan = buildDailyReviewPlan({
			reviewQueue: [
				candidate("hard-only", {
					difficulty: "Hard",
					latestRating: 3,
					lapses: 0,
				}),
				candidate("latest-again", {
					latestRating: 1,
					lapses: 0,
				}),
				candidate("lapsed", {
					latestRating: 3,
					lapses: 1,
				}),
			],
			nowUnix: NOW_UNIX,
			dailyReviewCount: 3,
		});

		expect(plan.cards.map((card) => card.cardId)).toEqual([
			"latest-again",
			"lapsed",
			"hard-only",
		]);
		expect(plan.summary.plannedHighRiskCount).toBe(2);
	});

	it("uses stable tie-breakers for equal Review Priority", () => {
		const plan = buildDailyReviewPlan({
			reviewQueue: [
				candidate("same-score-a", {
					due: TODAY_UNIX,
					reps: 4,
					difficulty: "Easy",
				}),
				candidate("same-score-b", {
					due: TODAY_UNIX,
					reps: 4,
					difficulty: "Easy",
				}),
			],
			nowUnix: NOW_UNIX,
			dailyReviewCount: 2,
		});

		expect(plan.cards.map((card) => card.cardId)).toEqual([
			"same-score-a",
			"same-score-b",
		]);
	});
});
