"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { ReviewFocus } from "@/components/review/ReviewFocus";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useAdaptiveNow } from "@/hooks/use-adaptive-now";
import { useFocusedCard } from "@/hooks/use-focused-card";
import { useRowNavHotkeys } from "@/hooks/use-row-hotkeys";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import { fetchDueCards, reviewQueryKeys } from "@/lib/review.functions";

/**
 * Today's plan as a focus view: one card at a time, picked from the sidebar,
 * the palette, J/K or digits. Rating a card advances to the next one.
 */
export function DashboardPage() {
	const { data: plan, error } = useQuery({
		queryKey: reviewQueryKeys.dueCards,
		queryFn: fetchDueCards,
		staleTime: 30_000,
	});
	const cards = plan?.cards ?? [];
	const { focused, focus } = useFocusedCard(cards);
	const index = focused ? cards.indexOf(focused) : -1;
	const dueUnixList = React.useMemo(
		() => cards.map((card) => card.due),
		[cards],
	);
	const nowMs = useAdaptiveNow(dueUnixList);

	const step = (delta: number) => {
		const next = cards[index + delta];
		if (next) focus(next);
	};
	useHotkey(HOTKEYS.nextCard, () => step(1), {
		ignoreInputs: true,
		meta: { name: "Next card", description: "Focus the next planned card" },
	});
	useHotkey(HOTKEYS.prevCard, () => step(-1), {
		ignoreInputs: true,
		meta: { name: "Previous card", description: "Focus the previous card" },
	});
	useRowNavHotkeys(cards.map((card) => ({ onSelect: () => focus(card) })));

	if (error) {
		return (
			<p className="m-6 rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-destructive-foreground text-sm">
				{error instanceof Error
					? error.message
					: "Could not load today's plan."}
			</p>
		);
	}

	if (!focused) {
		return <DoneForToday waitingCount={plan?.summary.waitingCount ?? 0} />;
	}

	return (
		<ReviewFocus
			key={focused.cardId}
			card={focused}
			nowMs={nowMs}
			// The rated card drops out of the plan on refetch; land on its
			// neighbour instead of jumping back to the top.
			onRated={() => focus(cards[index + 1] ?? cards[index - 1] ?? null)}
		/>
	);
}

function DoneForToday({ waitingCount }: { waitingCount: number }) {
	return (
		<div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
			<CircleCheck className="size-8 text-success-foreground" />
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-lg">Done for today</h2>
				<p className="max-w-sm text-muted-foreground text-sm">
					{waitingCount > 0
						? `${waitingCount} more due, held back to keep today to one study block.`
						: "Nothing else is due. Add a problem to keep the queue moving."}
				</p>
			</div>
			<div className="flex items-center gap-2">
				<Button variant="outline" render={<Link href="/problems" />}>
					All problems
				</Button>
				<span className="text-muted-foreground text-xs">
					or press <Kbd>{HOTKEY_LABELS.addProblem[0]}</Kbd> to add one
				</span>
			</div>
		</div>
	);
}
