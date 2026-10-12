"use client";

import * as React from "react";
import {
	setPlatformPreference,
	usePlatformPreference,
} from "@/hooks/use-platform-preference";
import {
	getPlatformUrl,
	type RandomReviewProblem,
	type ReviewPlatform,
	resolveRandomReviewPlatform,
} from "@/lib/random-review";

type OpenableProblem = RandomReviewProblem & { title: string };

/**
 * Opens a problem in a new tab on the preferred platform. Problems linked on
 * both platforms with no saved preference wait on `choice`, which drives
 * <PlatformChoiceDialog>.
 */
export function useOpenProblem() {
	const preference = usePlatformPreference();
	const [pending, setPending] = React.useState<OpenableProblem | null>(null);
	const [remember, setRemember] = React.useState(false);

	function open(problem: OpenableProblem) {
		const resolution = resolveRandomReviewPlatform({ problem, preference });
		if (resolution.type === "choose") {
			setRemember(false);
			setPending(problem);
			return;
		}
		window.open(resolution.url, "_blank", "noopener,noreferrer");
	}

	function choose(platform: ReviewPlatform) {
		if (!pending) return;
		if (remember) setPlatformPreference(platform);
		window.open(
			getPlatformUrl(pending, platform),
			"_blank",
			"noopener,noreferrer",
		);
		setPending(null);
	}

	return {
		open,
		choice: {
			problemTitle: pending?.title ?? null,
			remember,
			onRememberChange: setRemember,
			onChoose: choose,
			onCancel: () => setPending(null),
		},
	};
}
