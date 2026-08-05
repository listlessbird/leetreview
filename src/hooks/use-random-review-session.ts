"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { parseAsString, parseAsStringLiteral, useQueryStates } from "nuqs";
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
	sessionCards?: readonly DueCard[];
	isLoading: boolean;
	isBlocked: boolean;
	hasSearch: boolean;
	onSessionStart: () => void;
};

const REVIEW_PLATFORMS = ["leetcode", "neetcode"] as const;

function matchesRandomProblemState(card: DueCard, randomState: string) {
	return card.slug === randomState || card.cardId === randomState;
}

export function useRandomReviewSession({
	cards,
	sessionCards = cards,
	isLoading,
	isBlocked,
	hasSearch,
	onSessionStart,
}: UseRandomReviewSessionOptions) {
	const queryClient = useQueryClient();
	const [
		{ random: randomProblemSlug, platform: platformParam },
		setRandomState,
	] = useQueryStates(
		{
			random: parseAsString,
			platform: parseAsStringLiteral(REVIEW_PLATFORMS),
		},
		{ history: "replace" },
	);
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

	const randomProblem = React.useMemo(() => {
		if (!randomProblemSlug) return null;
		return (
			sessionCards.find((card) =>
				matchesRandomProblemState(card, randomProblemSlug),
			) ?? null
		);
	}, [randomProblemSlug, sessionCards]);

	const { session, platformChoiceProblem } = React.useMemo<{
		session: RandomReviewSession<DueCard> | null;
		platformChoiceProblem: DueCard | null;
	}>(() => {
		if (!randomProblem) return { session: null, platformChoiceProblem: null };

		if (platformParam) {
			return {
				session: {
					problem: randomProblem,
					platform: platformParam,
					url: getPlatformUrl(randomProblem, platformParam),
				},
				platformChoiceProblem: null,
			};
		}

		const resolution = resolveRandomReviewPlatform({
			problem: randomProblem,
			preference: platformPreference,
		});

		if (resolution.type === "choose") {
			return { session: null, platformChoiceProblem: randomProblem };
		}

		return {
			session: {
				problem: randomProblem,
				platform: resolution.platform,
				url: resolution.url,
			},
			platformChoiceProblem: null,
		};
	}, [platformParam, platformPreference, randomProblem]);

	const isActive = Boolean(session) || Boolean(platformChoiceProblem);

	React.useEffect(() => {
		const saved = window.localStorage.getItem(
			RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
		);
		if (isReviewPlatform(saved)) {
			setPlatformPreference(saved);
		}
	}, []);

	React.useEffect(() => {
		if (isLoading || !randomProblemSlug) return;
		if (
			sessionCards.some((card) =>
				matchesRandomProblemState(card, randomProblemSlug),
			)
		)
			return;
		void setRandomState(null);
	}, [isLoading, randomProblemSlug, sessionCards, setRandomState]);

	React.useEffect(() => {
		if (!randomProblem || randomProblemSlug !== randomProblem.cardId) return;
		void setRandomState({ random: randomProblem.slug });
	}, [randomProblem, randomProblemSlug, setRandomState]);

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

	const startProblem = React.useCallback(
		(problem: DueCard) => {
			const resolution = resolveRandomReviewPlatform({
				problem,
				preference: platformPreference,
			});

			onSessionStart();
			setError(null);
			setRememberPlatformChoice(false);

			if (resolution.type === "choose") {
				void setRandomState({ random: problem.slug, platform: null });
				return;
			}

			void setRandomState({
				random: problem.slug,
				platform: resolution.platform,
			});
			openUrl(resolution.url);
		},
		[onSessionStart, openUrl, platformPreference, setRandomState],
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

			void setRandomState({ platform });
			openUrl(getPlatformUrl(platformChoiceProblem, platform));
		},
		[
			openUrl,
			platformChoiceProblem,
			rememberPlatformChoice,
			setRandomState,
			setSavedPlatformPreference,
		],
	);

	const cancelPlatformChoice = React.useCallback(() => {
		void setRandomState(null);
		setRememberPlatformChoice(false);
	}, [setRandomState]);

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
				await setRandomState(null);
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
		[isSubmitting, queryClient, session, setRandomState],
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
			void setRandomState(null);
			setNotice("No reviews are ready right now.");
			return;
		}

		startProblem(nextProblem);
	}, [chooseProblem, session, setRandomState, skippedCardIds, startProblem]);

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
