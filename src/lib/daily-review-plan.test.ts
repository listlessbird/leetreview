import { describe, expect, it } from "vitest";
import {
	buildDailyReviewPlan,
	type DailyReviewPlanCandidate,
} from "./daily-review-plan";

const NOW_UNIX = Date.UTC(2026, 9, 9, 12) / 1000;
const DAY_SECONDS = 24 * 60 * 60;

function candidate(
	cardId: string,
	overrides: Partial<DailyReviewPlanCandidate> = {},
): DailyReviewPlanCandidate {
	return {
		cardId,
		createdAt: NOW_UNIX - 60 * DAY_SECONDS,
		reps: 3,
		retrievability: 0.6,
		...overrides,
	};
}

function plannedIds(reviewQueue: DailyReviewPlanCandidate[], count: number) {
	return buildDailyReviewPlan({
		reviewQueue,
		nowUnix: NOW_UNIX,
		dailyReviewCount: count,
	}).cards.map((card) => card.cardId);
}

describe("buildDailyReviewPlan", () => {
	it("caps the plan and reports what is left waiting", () => {
		const reviewQueue = Array.from({ length: 5 }, (_, index) =>
			candidate(`card-${index}`),
		);

		const plan = buildDailyReviewPlan({
			reviewQueue,
			nowUnix: NOW_UNIX,
			dailyReviewCount: 3,
		});

		expect(plan.summary).toEqual({
			dailyReviewCount: 3,
			plannedCount: 3,
			reviewQueueCount: 5,
			waitingCount: 2,
		});
	});

	it("orders reviewed problems by retrievability, highest first", () => {
		const reviewQueue = [
			candidate("forgotten", { retrievability: 0.4 }),
			candidate("slipping", { retrievability: 0.8 }),
			candidate("fading", { retrievability: 0.6 }),
		];

		expect(plannedIds(reviewQueue, 2)).toEqual(["slipping", "fading"]);
	});

	it("puts Fresh Problems ahead of everything else", () => {
		const reviewQueue = [
			candidate("slipping", { retrievability: 0.9 }),
			candidate("fresh", {
				reps: 0,
				retrievability: 0,
				createdAt: NOW_UNIX - DAY_SECONDS,
			}),
		];

		expect(plannedIds(reviewQueue, 1)).toEqual(["fresh"]);
	});

	it("treats long-unreviewed problems as forgotten, not fresh", () => {
		const reviewQueue = [
			candidate("neglected", { reps: 0, retrievability: 0 }),
			candidate("fading", { retrievability: 0.5 }),
		];

		expect(plannedIds(reviewQueue, 2)).toEqual(["fading", "neglected"]);
	});
});
