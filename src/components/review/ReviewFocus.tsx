"use client";

import { EditProblemButton } from "@/components/problems/EditProblemDialog";
import { ProblemNote } from "@/components/review/ProblemNote";
import {
	Difficulty,
	DueDate,
	PlatformLinks,
} from "@/components/review/problem-meta";
import { RatingBar } from "@/components/review/RatingBar";
import { Badge } from "@/components/ui/badge";
import { useSolveLanguage } from "@/hooks/use-solve-language";
import { useSubmitReview } from "@/hooks/use-submit-review";
import type { Rating } from "@/lib/rating";
import type { ReviewCard } from "@/lib/review.functions";

/**
 * One card, full height: problem meta at the top, the note in the middle and
 * the rating bar docked at the bottom, like T3 Code's composer. `onRated`
 * fires after the review is saved so the caller can advance.
 */
export function ReviewFocus({
	card,
	nowMs,
	onRated,
}: {
	card: ReviewCard & { due?: number };
	nowMs?: number;
	onRated: () => void;
}) {
	const solveLanguage = useSolveLanguage();
	const review = useSubmitReview();

	async function handleRate(rating: Rating) {
		try {
			await review.rate(card.cardId, rating);
			onRated();
		} catch {
			// surfaced through review.error
		}
	}

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
				<header className="flex flex-col gap-3">
					<div className="flex items-center gap-3">
						<Difficulty difficulty={card.difficulty} />
						{card.due !== undefined && nowMs !== undefined ? (
							<DueDate dueUnix={card.due} nowMs={nowMs} />
						) : null}
					</div>
					<div className="flex items-start justify-between gap-4">
						<div className="flex min-w-0 items-center gap-2">
							<h1 className="font-semibold text-2xl tracking-tight [overflow-wrap:anywhere]">
								{card.title}
							</h1>
							<EditProblemButton {...card} />
						</div>
						<PlatformLinks
							title={card.title}
							url={card.url}
							neetcodeUrl={card.neetcodeUrl}
						/>
					</div>
					{card.tags.length > 0 ? (
						<div className="flex flex-wrap gap-1.5">
							{card.tags.map((tag) => (
								<Badge key={tag} variant="outline" className="font-mono">
									{tag}
								</Badge>
							))}
						</div>
					) : null}
				</header>

				<p className="text-muted-foreground text-sm">
					Open the problem, solve it in{" "}
					<span className="text-foreground">
						{solveLanguage === "java" ? "Java" : "Python"}
					</span>
					, then rate your recall.
				</p>

				<ProblemNote notes={card.notes} />
			</div>

			<div className="sticky bottom-0 bg-linear-to-t from-background via-background to-transparent pt-6">
				<div className="mx-auto w-full max-w-3xl px-4 pb-4 sm:px-6">
					<div className="rounded-2xl border bg-card p-2 shadow-lg/5">
						<RatingBar
							key={card.cardId}
							onRate={(rating) => void handleRate(rating)}
							disabled={review.isSubmitting}
						/>
					</div>
					{review.error ? (
						<p className="mt-2 text-destructive-foreground text-sm">
							{review.error}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
