import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { getReviewCard, submitReview } from "@/lib/review.functions";
import {
	formatReviewAvailabilityReason,
	PROBLEM_TYPES,
} from "@/lib/review-policy";

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
	const isSystemDesign = card.type === PROBLEM_TYPES.SYSTEM_DESIGN;
	const isReviewLocked = isSystemDesign && !card.canReviewToday;
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleRate = useCallback(
		async (rating: 1 | 2 | 3 | 4) => {
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
		},
		[card.cardId, navigate],
	);

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="text-2xl font-bold tracking-tight">{card.title}</h1>
				<p className="mt-1 text-sm text-white/65">
					{card.type === PROBLEM_TYPES.SYSTEM_DESIGN
						? "System Design"
						: "LeetCode"}{" "}
					• {card.difficulty}
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
					{card.type === PROBLEM_TYPES.LEETCODE && card.url ? (
						<a
							href={card.url}
							target="_blank"
							rel="noreferrer"
							className="underline decoration-white/35 underline-offset-4"
						>
							Open on LeetCode
						</a>
					) : (
						<div className="space-y-3">
							<p className="text-white/65">Resources: </p>
							<ResourceList resources={card.resources} />
						</div>
					)}
				</div>
				{isReviewLocked ? (
					<p className="mt-4 rounded border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-sm text-amber-100">
						{formatReviewAvailabilityReason(
							card.reviewAvailabilityReason ?? "daily-cap",
						)}
					</p>
				) : null}
				<div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
					<button
						type="button"
						onClick={() => void handleRate(1)}
						disabled={isSubmitting || isReviewLocked}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Again
					</button>
					<button
						type="button"
						onClick={() => void handleRate(2)}
						disabled={isSubmitting || isReviewLocked}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Hard
					</button>
					<button
						type="button"
						onClick={() => void handleRate(3)}
						disabled={isSubmitting || isReviewLocked}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						Good
					</button>
					<button
						type="button"
						onClick={() => void handleRate(4)}
						disabled={isSubmitting || isReviewLocked}
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

function ResourceList({
	resources,
}: {
	resources: Array<{ id: string; url: string; title: string | null }>;
}) {
	const processedResources = useMemo(
		() =>
			resources.map((resource) => {
				const hostname = getHostname(resource.url);
				return {
					...resource,
					hostname,
					faviconSrc: hostname
						? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=16`
						: null,
				};
			}),
		[resources],
	);

	if (processedResources.length === 0) {
		return <p className="text-sm text-white/50">No resources linked.</p>;
	}

	return (
		<ul className="space-y-2">
			{processedResources.map((resource) => (
				<li key={resource.id}>
					<a
						href={resource.url}
						target="_blank"
						rel="noreferrer"
						className="flex items-center gap-2 text-sm text-[#ededf5] underline decoration-white/20 underline-offset-4"
					>
						{resource.faviconSrc ? (
							<img
								alt=""
								aria-hidden="true"
								className="size-4 rounded-sm"
								height={16}
								src={resource.faviconSrc}
								width={16}
							/>
						) : (
							<span className="inline-flex size-4 rounded-sm bg-white/10" />
						)}
						<span>{resource.title || resource.hostname || resource.url}</span>
					</a>
				</li>
			))}
		</ul>
	);
}

function getHostname(url: string) {
	try {
		return new URL(url).hostname;
	} catch {
		return null;
	}
}
