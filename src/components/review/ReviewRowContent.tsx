"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";

import { Kbd } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import { cn } from "@/lib/utils";
import {
	reviewQueryKeys,
	submitReview,
} from "@/lib/review.functions";

interface ReviewRowContentProps {
	cardId: string;
	onClose: () => void;
}

const RATING_HINTS = {
	Again: "couldn't derive without major hint",
	Hard: "solved, but slow or shaky",
	Good: "solved cleanly after thinking",
	Easy: "recognized pattern, can code it",
} as const;

export function ReviewRowContent({ cardId, onClose }: ReviewRowContentProps) {
	const queryClient = useQueryClient();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

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
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to submit review.");
			setIsSubmitting(false);
		}
	}

	// Hotkeys are registered here so they're only active while this component
	// is mounted (i.e. while a review row is expanded).
	useHotkey(HOTKEYS.rateAgain, () => void handleRate(1), {
		ignoreInputs: true,
		meta: { name: "Rate: Again", description: "Submit Again rating" },
	});
	useHotkey(HOTKEYS.rateHard, () => void handleRate(2), {
		ignoreInputs: true,
		meta: { name: "Rate: Hard", description: "Submit Hard rating" },
	});
	useHotkey(HOTKEYS.rateGood, () => void handleRate(3), {
		ignoreInputs: true,
		meta: { name: "Rate: Good", description: "Submit Good rating" },
	});
	useHotkey(HOTKEYS.rateEasy, () => void handleRate(4), {
		ignoreInputs: true,
		meta: { name: "Rate: Easy", description: "Submit Easy rating" },
	});

	return (
		<div className="flex h-full items-center gap-3 px-3 py-2">
			<span className="shrink-0 text-xs text-white/40">Rate recall:</span>
			<TooltipProvider>
				<div className="flex items-center gap-1.5">
					<RatingButton
						label="Again"
						hotkey={HOTKEY_LABELS.rateAgain[0]}
						onClick={() => void handleRate(1)}
						disabled={isSubmitting}
						colorClass="hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
					/>
					<RatingButton
						label="Hard"
						hotkey={HOTKEY_LABELS.rateHard[0]}
						onClick={() => void handleRate(2)}
						disabled={isSubmitting}
						colorClass="hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-200"
					/>
					<RatingButton
						label="Good"
						hotkey={HOTKEY_LABELS.rateGood[0]}
						onClick={() => void handleRate(3)}
						disabled={isSubmitting}
						colorClass="hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200"
					/>
					<RatingButton
						label="Easy"
						hotkey={HOTKEY_LABELS.rateEasy[0]}
						onClick={() => void handleRate(4)}
						disabled={isSubmitting}
						colorClass="hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
					/>
				</div>
			</TooltipProvider>
			{error ? (
				<span className="text-xs text-red-300">{error}</span>
			) : null}
			<button
				type="button"
				onClick={onClose}
				aria-label="Close review"
				className="ml-auto transform-gpu rounded border border-white/10 p-1 text-white/30 transition-colors duration-150 ease-out hover:border-white/20 hover:text-white/60 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
			>
				<X className="size-3.5" />
			</button>
		</div>
	);
}

interface RatingButtonProps {
	label: keyof typeof RATING_HINTS;
	hotkey: string;
	onClick: () => void;
	disabled: boolean;
	colorClass: string;
}

function RatingButton({ label, hotkey, onClick, disabled, colorClass }: RatingButtonProps) {
	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					type="button"
					onClick={onClick}
					disabled={disabled}
					className={cn(
						"group transform-gpu inline-flex items-center gap-1.5 rounded border border-white/20 px-2.5 py-1.5 text-xs text-white/75 transition-colors duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
						colorClass,
					)}
				>
					{label}
					<Kbd className="border border-white/15 bg-white/8 text-[10px] text-white/45">{hotkey}</Kbd>
				</button>
			</TooltipTrigger>
			<TooltipContent
				side="top"
				className="border border-white/10 bg-[#11121a] text-white/60"
			>
				{RATING_HINTS[label]}
			</TooltipContent>
		</Tooltip>
	);
}
