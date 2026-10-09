"use client";

import * as React from "react";
import {
	DEFAULT_SOLVE_LANGUAGE,
	isSolveLanguage,
	type SolveLanguage,
} from "@/lib/rating";

const SOLVE_LANGUAGE_KEY = "leetreview.solveLanguage.v1";
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function readSolveLanguage(): SolveLanguage {
	const saved = window.localStorage.getItem(SOLVE_LANGUAGE_KEY);
	return isSolveLanguage(saved) ? saved : DEFAULT_SOLVE_LANGUAGE;
}

export function setSolveLanguage(language: SolveLanguage) {
	window.localStorage.setItem(SOLVE_LANGUAGE_KEY, language);
	for (const listener of listeners) listener();
}

/**
 * The language reviews are currently solved in, saved per browser and shared
 * by every review surface so a change in settings applies everywhere at once.
 */
export function useSolveLanguage() {
	return React.useSyncExternalStore(
		subscribe,
		readSolveLanguage,
		() => DEFAULT_SOLVE_LANGUAGE,
	);
}
