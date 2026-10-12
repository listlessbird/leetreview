"use client";

import { useHotkey } from "@tanstack/react-hotkeys";

import { Kbd } from "@/components/ui/kbd";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import { RATING_HINTS, RATINGS, type Rating } from "@/lib/rating";
import { cn } from "@/lib/utils";

const RATING_TONES: Record<Rating, string> = {
	1: "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive-foreground",
	2: "hover:border-warning/40 hover:bg-warning/10 hover:text-warning-foreground",
	3: "hover:border-success/40 hover:bg-success/10 hover:text-success-foreground",
	4: "hover:border-info/40 hover:bg-info/10 hover:text-info-foreground",
};

/**
 * The four FSRS grades as buttons plus their A/H/G/E hotkeys. Hotkeys live
 * here so they are only bound while a rating surface is on screen.
 * `docked` spells out each hint under its label; `inline` keeps hints in
 * tooltips for tight rows.
 */
export function RatingBar({
	onRate,
	disabled,
	variant = "docked",
	className,
}: {
	onRate: (rating: Rating) => void;
	disabled: boolean;
	variant?: "docked" | "inline";
	className?: string;
}) {
	const rate = (rating: Rating) => {
		if (!disabled) onRate(rating);
	};
	const options = { ignoreInputs: true } as const;
	useHotkey(HOTKEYS.rateAgain, () => rate(1), {
		...options,
		meta: { name: "Rate: Again", description: "Submit Again rating" },
	});
	useHotkey(HOTKEYS.rateHard, () => rate(2), {
		...options,
		meta: { name: "Rate: Hard", description: "Submit Hard rating" },
	});
	useHotkey(HOTKEYS.rateGood, () => rate(3), {
		...options,
		meta: { name: "Rate: Good", description: "Submit Good rating" },
	});
	useHotkey(HOTKEYS.rateEasy, () => rate(4), {
		...options,
		meta: { name: "Rate: Easy", description: "Submit Easy rating" },
	});

	return (
		<div
			className={cn(
				variant === "docked"
					? "grid grid-cols-2 gap-2 sm:grid-cols-4"
					: "flex items-center gap-1.5",
				className,
			)}
		>
			{RATINGS.map(({ rating, label, hotkey }) => {
				const button = (
					<button
						key={rating}
						type="button"
						disabled={disabled}
						onClick={() => rate(rating)}
						className={cn(
							"group flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-input bg-popover text-foreground shadow-xs/5 outline-none transition-[color,background-color,border-color,scale] duration-150 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:pointer-events-none disabled:opacity-64 motion-reduce:transition-none dark:bg-input/32",
							variant === "docked"
								? "flex-col px-3 py-2.5 text-sm"
								: "h-7 px-2.5 text-xs",
							RATING_TONES[rating],
						)}
					>
						<span className="flex items-center gap-2 font-medium">
							{label}
							<Kbd className="font-mono">{HOTKEY_LABELS[hotkey][0]}</Kbd>
						</span>
						{variant === "docked" ? (
							<span className="text-center text-3xs text-muted-foreground leading-tight">
								{RATING_HINTS[label]}
							</span>
						) : null}
					</button>
				);

				if (variant === "docked") return button;
				return (
					<Tooltip key={rating}>
						<TooltipTrigger render={button} />
						<TooltipPopup>{RATING_HINTS[label]}</TooltipPopup>
					</Tooltip>
				);
			})}
		</div>
	);
}
