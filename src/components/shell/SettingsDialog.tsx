"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { Radio, RadioGroup } from "@/components/ui/radio-group";
import {
	setPlatformPreference,
	usePlatformPreference,
} from "@/hooks/use-platform-preference";
import { setSolveLanguage, useSolveLanguage } from "@/hooks/use-solve-language";
import { authClient } from "@/lib/auth-client";
import { isReviewPlatform } from "@/lib/random-review";
import { isSolveLanguage } from "@/lib/rating";

/** Review preferences and sign out. Controlled by the app shell. */
export function SettingsDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const router = useRouter();
	const [isSigningOut, setIsSigningOut] = useState(false);
	const platformPreference = usePlatformPreference();
	const solveLanguage = useSolveLanguage();

	async function handleSignOut() {
		setIsSigningOut(true);
		try {
			await authClient.signOut();
			router.replace("/");
			router.refresh();
		} finally {
			setIsSigningOut(false);
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogPopup className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Settings</DialogTitle>
					<DialogDescription>Review preferences.</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-6">
					<SettingSection
						title="Platform"
						description="Opened when a problem is on both LeetCode and NeetCode."
						value={platformPreference ?? "ask"}
						onValueChange={(value) =>
							setPlatformPreference(isReviewPlatform(value) ? value : null)
						}
						options={[
							{ value: "ask", label: "Ask every time" },
							{ value: "leetcode", label: "LeetCode" },
							{ value: "neetcode", label: "NeetCode" },
						]}
					/>
					<SettingSection
						title="Solving language"
						description="Recorded with every review you rate."
						value={solveLanguage}
						onValueChange={(value) => {
							if (isSolveLanguage(value)) setSolveLanguage(value);
						}}
						options={[
							{ value: "java", label: "Java" },
							{ value: "python", label: "Python" },
						]}
					/>
				</DialogPanel>
				<DialogFooter>
					<Button
						variant="destructive-outline"
						onClick={handleSignOut}
						disabled={isSigningOut}
					>
						<LogOut />
						{isSigningOut ? "Signing out..." : "Sign out"}
					</Button>
				</DialogFooter>
			</DialogPopup>
		</Dialog>
	);
}

/** A titled radio group rendered as a row of compact options. */
function SettingSection({
	title,
	description,
	value,
	onValueChange,
	options,
}: {
	title: string;
	description: string;
	value: string;
	onValueChange: (value: string) => void;
	options: { value: string; label: string }[];
}) {
	const titleId = useId();

	return (
		<section className="flex flex-col gap-3">
			<div>
				<h2 id={titleId} className="font-medium text-sm">
					{title}
				</h2>
				<p className="text-muted-foreground text-xs">{description}</p>
			</div>
			<RadioGroup
				value={value}
				onValueChange={(next) => onValueChange(String(next))}
				aria-labelledby={titleId}
				className="flex flex-wrap gap-2"
			>
				{options.map((option) => (
					<Label
						key={option.value}
						className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-normal transition-colors hover:bg-accent has-data-checked:border-primary/40 has-data-checked:bg-primary/8"
					>
						<Radio value={option.value} />
						{option.label}
					</Label>
				))}
			</RadioGroup>
		</section>
	);
}
