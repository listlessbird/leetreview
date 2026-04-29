"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { HOTKEYS } from "@/lib/hotkeys";
import {
	chooseRandomReview,
	getPlatformUrl,
	isReviewPlatform,
	RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
	type RandomReviewSession,
	type ReviewPlatform,
	resolveRandomReviewPlatform,
} from "@/lib/random-review";
import {
	type DueCard,
	reviewQueryKeys,
	submitReview,
} from "@/lib/review.functions";

type UseRandomReviewSessionOptions = {
	cards: readonly DueCard[];
	isLoading: boolean;
	isBlocked: boolean;
	hasSearch: boolean;
	onSessionStart: () => void;
};

export function useRandomReviewSession({
	cards,
	isLoading,
	isBlocked,
	hasSearch,
	onSessionStart,
}: UseRandomReviewSessionOptions) {
	const queryClient = useQueryClient();
	const [session, setSession] =
		React.useState<RandomReviewSession<DueCard> | null>(null);
	const [platformChoiceProblem, setPlatformChoiceProblem] =
		React.useState<DueCard | null>(null);
	const [rememberPlatformChoice, setRememberPlatformChoice] =
		React.useState(false);
	const [platformPreference, setPlatformPreference] =
		React.useState<ReviewPlatform | null>(null);
	const [skippedCardIds, setSkippedCardIds] = React.useState<Set<string>>(
		() => new Set(),
	);
	const [notice, setNotice] = React.useState<string | null>(null);
	const [error, setError] = React.useState<string | null>(null);
	const [isSubmitting, setIsSubmitting] = React.useState(false);
	const isActive = Boolean(session) || Boolean(platformChoiceProblem);

	React.useEffect(() => {
		const saved = window.localStorage.getItem(
			RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
		);
		if (isReviewPlatform(saved)) {
			setPlatformPreference(saved);
		}
	}, []);

	const openUrl = React.useCallback((url: string) => {
		const opened = window.open(url, "_blank", "noopener,noreferrer");
		if (!opened) {
			setNotice(
				"Your browser blocked the new tab. Use Open again from the review session.",
			);
			return;
		}

		setNotice(null);
	}, []);

	const setSavedPlatformPreference = React.useCallback(
		(preference: ReviewPlatform | null) => {
			if (preference) {
				window.localStorage.setItem(
					RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
					preference,
				);
			} else {
				window.localStorage.removeItem(RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY);
			}
			setPlatformPreference(preference);
		},
		[],
	);

	const beginSession = React.useCallback(
		(nextSession: RandomReviewSession<DueCard>) => {
			onSessionStart();
			setPlatformChoiceProblem(null);
			setRememberPlatformChoice(false);
			setError(null);
			setSession(nextSession);
			openUrl(nextSession.url);
		},
		[onSessionStart, openUrl],
	);

	const startProblem = React.useCallback(
		(problem: DueCard) => {
			const resolution = resolveRandomReviewPlatform({
				problem,
				preference: platformPreference,
			});

			onSessionStart();
			setError(null);

			if (resolution.type === "choose") {
				setSession(null);
				setPlatformChoiceProblem(problem);
				setRememberPlatformChoice(false);
				return;
			}

			beginSession({
				problem,
				platform: resolution.platform,
				url: resolution.url,
			});
		},
		[beginSession, onSessionStart, platformPreference],
	);

	const chooseProblem = React.useCallback(
		(nextSkippedCardIds = skippedCardIds) => {
			const result = chooseRandomReview({
				problems: cards,
				skippedCardIds: nextSkippedCardIds,
			});

			if (result.skippedReset) {
				setSkippedCardIds(new Set());
			}

			return result.problem;
		},
		[cards, skippedCardIds],
	);

	const start = React.useCallback(() => {
		if (isActive || isBlocked || isLoading) return;

		const problem = chooseProblem();
		if (!problem) {
			setNotice(
				hasSearch
					? "No matching reviews in the filtered review queue."
					: "No reviews are ready right now.",
			);
			return;
		}

		startProblem(problem);
	}, [chooseProblem, hasSearch, isActive, isBlocked, isLoading, startProblem]);

	const choosePlatform = React.useCallback(
		(platform: ReviewPlatform) => {
			if (!platformChoiceProblem) return;

			if (rememberPlatformChoice) {
				setSavedPlatformPreference(platform);
			}

			beginSession({
				problem: platformChoiceProblem,
				platform,
				url: getPlatformUrl(platformChoiceProblem, platform),
			});
		},
		[
			beginSession,
			platformChoiceProblem,
			rememberPlatformChoice,
			setSavedPlatformPreference,
		],
	);

	const cancelPlatformChoice = React.useCallback(() => {
		setPlatformChoiceProblem(null);
		setRememberPlatformChoice(false);
	}, []);

	const rate = React.useCallback(
		async (rating: 1 | 2 | 3 | 4) => {
			if (!session || isSubmitting) return;

			setError(null);
			setIsSubmitting(true);
			try {
				await submitReview({
					data: { cardId: session.problem.cardId, rating },
				});
				await Promise.all([
					queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
					queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
					queryClient.invalidateQueries({
						queryKey: reviewQueryKeys.reviewCard(session.problem.cardId),
					}),
				]);
				setSession(null);
				setNotice(null);
			} catch (submitError) {
				setError(
					submitError instanceof Error
						? submitError.message
						: "Failed to submit review.",
				);
			} finally {
				setIsSubmitting(false);
			}
		},
		[isSubmitting, queryClient, session],
	);

	const openAgain = React.useCallback(() => {
		if (!session) return;
		openUrl(session.url);
	}, [openUrl, session]);

	const skip = React.useCallback(() => {
		if (!session) return;

		const nextSkippedCardIds = new Set(skippedCardIds);
		nextSkippedCardIds.add(session.problem.cardId);
		setSkippedCardIds(nextSkippedCardIds);

		const nextProblem = chooseProblem(nextSkippedCardIds);
		if (!nextProblem) {
			setSession(null);
			setNotice("No reviews are ready right now.");
			return;
		}

		startProblem(nextProblem);
	}, [chooseProblem, session, skippedCardIds, startProblem]);

	useHotkey(HOTKEYS.randomReview, start, {
		ignoreInputs: true,
		preventDefault: true,
		meta: {
			name: "Random review",
			description: "Start a Random Review Session",
		},
	});

	return {
		isActive,
		notice,
		start,
		platformChoice: {
			problem: platformChoiceProblem,
			remember: rememberPlatformChoice,
			setRemember: setRememberPlatformChoice,
			choose: choosePlatform,
			cancel: cancelPlatformChoice,
		},
		sessionDialog: {
			session,
			isSubmitting,
			error,
			rate,
			openAgain,
			skip,
		},
		settings: {
			platformPreference,
			setPlatformPreference: setSavedPlatformPreference,
		},
	};
}
