import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { getReviewCard, submitReview } from "@/lib/review.server";

export const Route = createFileRoute("/_protected/review/$cardId")({
	loader: async ({ params }) =>
		getReviewCard({ data: { cardId: params.cardId } }),
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary
			error={error}
			reset={reset}
			title="Couldn't load review card"
		/>
	),
	component: ReviewCardPage,
});

function ReviewCardPage() {
	const navigate = useNavigate();
	const card = Route.useLoaderData();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleRate(rating: 1 | 2 | 3 | 4) {
		setError(null);
		setIsSubmitting(true);
		try {
			await submitReview({ data: { cardId: card.cardId, rating } });
			await navigate({ to: "/dashboard" });
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
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Again
					</button>
					<button
						type="button"
						onClick={() => void handleRate(2)}
						disabled={isSubmitting}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Hard
					</button>
					<button
						type="button"
						onClick={() => void handleRate(3)}
						disabled={isSubmitting}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Good
					</button>
					<button
						type="button"
						onClick={() => void handleRate(4)}
						disabled={isSubmitting}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Easy
					</button>
				</div>
				{error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
			</div>
		</div>
	);
}
