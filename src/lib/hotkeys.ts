/**
 * Central hotkey configuration.
 * Change bindings here — components only import the constants.
 */
export const HOTKEYS = {
	/** Open the Add Problem dialog */
	addProblem: "C",
	/** Open the command palette — Mod resolves to Ctrl on Linux/Windows, Cmd on Mac */
	commandPalette: "Mod+K",
	/** Focus the problems table search */
	searchFocus: "/",
	/** Jump to a random card in today's plan and open it */
	randomReview: "R",
	/** Move through today's queue in the focus view */
	nextCard: "J",
	prevCard: "K",
	/** Open the focused problem on its platform */
	openProblem: "O",
	/** Rate the focused review */
	rateAgain: "A",
	rateHard: "H",
	rateGood: "G",
	rateEasy: "E",
} as const;

export type HotkeyId = keyof typeof HOTKEYS;

/** Human-readable label strings for Kbd display, in key order */
export const HOTKEY_LABELS: Record<HotkeyId, string[]> = {
	addProblem: ["C"],
	commandPalette: ["Ctrl", "K"],
	searchFocus: ["/"],
	randomReview: ["R"],
	nextCard: ["J"],
	prevCard: ["K"],
	openProblem: ["O"],
	rateAgain: ["A"],
	rateHard: ["H"],
	rateGood: ["G"],
	rateEasy: ["E"],
};
