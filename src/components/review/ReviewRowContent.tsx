"use client";

import { X } from "lucide-react";

import { ProblemNote } from "@/components/review/ProblemNote";
import { RatingBar } from "@/components/review/RatingBar";
import { Button } from "@/components/ui/button";
import { useSolveLanguage } from "@/hooks/use-solve-language";
import { useSubmitReview } from "@/hooks/use-submit-review";
import type { Rating } from "@/lib/rating";

/** Inline rating for an expanded problems-table row. */
export function ReviewRowContent({
	cardId,
	notes,
	onClose,
}: {
	cardId: string;
	notes: string | null;
	onClose: () => void;
}) {
	const solveLanguage = useSolveLanguage();
	const review = useSubmitReview();

	async function handleRate(rating: Rating) {
		try {
			await review.rate(cardId, rating);
			onClose();
		} catch {
			// surfaced through review.error
		}
	}

	return (
		<div className="flex flex-col gap-2 bg-muted/40 px-3 py-2.5">
			<ProblemNote notes={notes} />
			<div className="flex items-center gap-3">
				<span className="shrink-0 text-muted-foreground text-xs">
					Rate recall ({solveLanguage === "java" ? "Java" : "Python"})
				</span>
				<RatingBar
					variant="inline"
					onRate={(rating) => void handleRate(rating)}
					disabled={review.isSubmitting}
				/>
				{review.error ? (
					<span className="text-destructive-foreground text-xs">
						{review.error}
					</span>
				) : null}
				<Button
					size="icon-xs"
					variant="ghost"
					onClick={onClose}
					aria-label="Close review"
					className="ml-auto"
				>
					<X />
				</Button>
			</div>
		</div>
	);
}
