"use client";

import { parseAsString, useQueryState } from "nuqs";
import type { DueCard } from "@/lib/review.functions";

/**
 * The card the focus view shows, kept in `?card=<slug>` so the sidebar,
 * palette and hotkeys can all point at it. Falls back to the first card in
 * the plan; accepts a cardId too so old links keep working.
 */
export function useFocusedCard(cards: readonly DueCard[]) {
	const [param, setParam] = useQueryState(
		"card",
		parseAsString.withOptions({ history: "replace" }),
	);
	const focused =
		cards.find((card) => card.slug === param || card.cardId === param) ??
		cards[0] ??
		null;

	return {
		focused,
		focus: (card: DueCard | null) => void setParam(card?.slug ?? null),
	};
}
