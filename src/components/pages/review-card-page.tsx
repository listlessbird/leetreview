"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
	fetchReviewCard,
	reviewQueryKeys,
	submitReview,
} from "@/lib/review.functions";

export function ReviewCardPage({ cardId }: { cardId: string }) {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const {
		data: card,
		error: loadError,
		isLoading,
	} = useQuery({
		queryKey: reviewQueryKeys.reviewCard(cardId),
		queryFn: () => fetchReviewCard(cardId),
		staleTime: 30_000,
	});

	async function handleRate(rating: 1 | 2 | 3 | 4) {
		setError(null);
		setIsSubmitting(true);
		try {
			await submitReview({ data: { cardId, rating } });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
				queryClient.invalidateQueries({
					queryKey: reviewQueryKeys.reviewCard(cardId),
				}),
			]);
			router.replace("/dashboard");
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Failed to submit review.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	if (isLoading) {
		return (
			<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
				<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6 text-sm text-white/70">
					Loading review card...
				</div>
			</div>
		);
	}

	if (!card) {
		return (
			<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
				<div className="mx-auto w-full max-w-3xl rounded border border-red-500/20 bg-red-500/6 p-6 text-sm text-red-200">
					{loadError instanceof Error
						? loadError.message
						: "Could not load review card."}
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="text-2xl font-bold tracking-tight">{card.title}</h1>
				<p className="mt-1 text-sm text-white/65">
					Difficulty: {card.difficulty}
				</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{card.tags.map((tag) => (
						<span
							key={tag}
							className="rounded border border-white/15 px-2 py-1 text-xs text-white/70"
						>
							{tag}
						</span>
					))}
				</div>
				<div className="mt-6 rounded border border-white/10 bg-black/20 p-4 text-sm text-white/80">
					<p className="mb-2">
						Open the problem, solve it, then rate your recall.
					</p>
					<a
						href={card.url}
						target="_blank"
						rel="noreferrer"
						className="underline decoration-white/35 underline-offset-4"
					>
						Open on LeetCode
					</a>
				</div>
				<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
					<button
						type="button"
						onClick={() => void handleRate(1)}
						disabled={isSubmitting}
						className="flex flex-col items-center gap-1 rounded border border-white/20 px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Again
						<span className="text-[10px] font-normal text-white/35">
							couldn&apos;t derive without major hint
						</span>
					</button>
					<button
						type="button"
						onClick={() => void handleRate(2)}
						disabled={isSubmitting}
						className="flex flex-col items-center gap-1 rounded border border-white/20 px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Hard
						<span className="text-[10px] font-normal text-white/35">
							solved, but slow or shaky
						</span>
					</button>
					<button
						type="button"
						onClick={() => void handleRate(3)}
						disabled={isSubmitting}
						className="flex flex-col items-center gap-1 rounded border border-white/20 px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Good
						<span className="text-[10px] font-normal text-white/35">
							solved cleanly after thinking
						</span>
					</button>
					<button
						type="button"
						onClick={() => void handleRate(4)}
						disabled={isSubmitting}
						className="flex flex-col items-center gap-1 rounded border border-white/20 px-3 py-2.5 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Easy
						<span className="text-[10px] font-normal text-white/35">
							recognized pattern, can code it
						</span>
					</button>
				</div>
				{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
			</div>
		</div>
	);
}
