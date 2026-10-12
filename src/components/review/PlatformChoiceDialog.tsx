"use client";

import { useId } from "react";
import { SiLeetcode } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { ReviewPlatform } from "@/lib/random-review";

/** Asks which platform to open for a problem linked on both, optionally remembering it. */
export function PlatformChoiceDialog({
	problemTitle,
	remember,
	onRememberChange,
	onChoose,
	onCancel,
}: {
	problemTitle: string | null;
	remember: boolean;
	onRememberChange: (remember: boolean) => void;
	onChoose: (platform: ReviewPlatform) => void;
	onCancel: () => void;
}) {
	const rememberId = useId();

	return (
		<Dialog
			open={problemTitle !== null}
			onOpenChange={(open) => {
				if (!open) onCancel();
			}}
		>
			<DialogPopup showCloseButton={false} className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Choose platform</DialogTitle>
					<DialogDescription>
						{problemTitle} is available on both platforms.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-4">
					<div className="grid grid-cols-2 gap-2">
						<Button
							variant="outline"
							size="xl"
							onClick={() => onChoose("leetcode")}
						>
							<SiLeetcode className="text-[#FFA116]" />
							LeetCode
						</Button>
						<Button
							variant="outline"
							size="xl"
							onClick={() => onChoose("neetcode")}
						>
							<span className="font-bold font-mono text-success-foreground text-xs">
								NC
							</span>
							NeetCode
						</Button>
					</div>
					<Label htmlFor={rememberId} className="gap-2 font-normal">
						<Checkbox
							id={rememberId}
							checked={remember}
							onCheckedChange={(checked) => onRememberChange(checked)}
						/>
						Remember this option
					</Label>
				</DialogPanel>
				<DialogFooter variant="bare">
					<Button variant="ghost" onClick={onCancel}>
						Cancel
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}
