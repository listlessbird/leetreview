"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSolveLanguage } from "@/hooks/use-solve-language";
import type { Rating } from "@/lib/rating";
import { reviewQueryKeys, submitReview } from "@/lib/review.functions";

/**
 * Rates a card in the current solve language and refreshes every review
 * query. The one submit path shared by the focus view and the problems table.
 */
export function useSubmitReview() {
	const queryClient = useQueryClient();
	const language = useSolveLanguage();

	const mutation = useMutation({
		mutationFn: ({ cardId, rating }: { cardId: string; rating: Rating }) =>
			submitReview({ data: { cardId, rating, language } }),
		onSuccess: (_, { cardId }) =>
			Promise.all([
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
				queryClient.invalidateQueries({
					queryKey: reviewQueryKeys.reviewCard(cardId),
				}),
			]),
	});

	return {
		rate: (cardId: string, rating: Rating) =>
			mutation.mutateAsync({ cardId, rating }),
		isSubmitting: mutation.isPending,
		error: mutation.error
			? mutation.error instanceof Error
				? mutation.error.message
				: "Failed to submit review."
			: null,
		reset: mutation.reset,
	};
}
