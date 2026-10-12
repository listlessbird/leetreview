"use client";

import * as React from "react";
import {
	isReviewPlatform,
	RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
	type ReviewPlatform,
} from "@/lib/random-review";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

function readPlatformPreference(): ReviewPlatform | null {
	const saved = window.localStorage.getItem(
		RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
	);
	return isReviewPlatform(saved) ? saved : null;
}

/** null means "ask every time" for problems on both platforms. */
export function setPlatformPreference(preference: ReviewPlatform | null) {
	if (preference) {
		window.localStorage.setItem(
			RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY,
			preference,
		);
	} else {
		window.localStorage.removeItem(RANDOM_REVIEW_PLATFORM_PREFERENCE_KEY);
	}
	for (const listener of listeners) listener();
}

/**
 * Which platform opens when a problem exists on both LeetCode and NeetCode,
 * saved per browser and shared by settings and the random picker.
 */
export function usePlatformPreference() {
	return React.useSyncExternalStore(
		subscribe,
		readPlatformPreference,
		() => null,
	);
}
