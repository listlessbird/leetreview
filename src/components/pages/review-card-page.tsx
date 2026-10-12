"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { ReviewFocus } from "@/components/review/ReviewFocus";
import { Spinner } from "@/components/ui/spinner";
import { fetchReviewCard, reviewQueryKeys } from "@/lib/review.functions";

/** Any tracked card in the focus view, for reviews outside today's plan. */
export function ReviewCardPage({ cardId }: { cardId: string }) {
	const router = useRouter();
	const {
		data: card,
		error,
		isLoading,
	} = useQuery({
		queryKey: reviewQueryKeys.reviewCard(cardId),
		queryFn: () => fetchReviewCard(cardId),
		staleTime: 30_000,
	});

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center">
				<Spinner />
			</div>
		);
	}

	if (!card) {
		return (
			<p className="m-6 rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-destructive-foreground text-sm">
				{error instanceof Error ? error.message : "Could not load review card."}
			</p>
		);
	}

	return (
		<ReviewFocus card={card} onRated={() => router.replace("/dashboard")} />
	);
}
