/**
 * Central hotkey configuration.
 * Change bindings here — components only import the constants.
 */
export const HOTKEYS = {
	/** Open the Add Problem dialog */
	addProblem: "C",
	/** Focus the search input — Mod resolves to Ctrl on Linux/Windows, Cmd on Mac */
	searchFocus: "Mod+K",
	/** Rate the current review — only active while a review row is expanded */
	rateAgain: "A",
	rateHard: "H",
	rateGood: "G",
	rateEasy: "E",
} as const;

export type HotkeyId = keyof typeof HOTKEYS;

/** Human-readable label strings for Kbd display, in key order */
export const HOTKEY_LABELS: Record<HotkeyId, string[]> = {
	addProblem: ["C"],
	searchFocus: ["Ctrl", "K"],
	rateAgain: ["A"],
	rateHard: ["H"],
	rateGood: ["G"],
	rateEasy: ["E"],
};
