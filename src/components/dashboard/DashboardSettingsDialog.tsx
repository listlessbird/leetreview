"use client";

import { LogOut, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { authClient } from "@/lib/auth-client";
import type { ReviewPlatform } from "@/lib/random-review";

type PlatformSettingValue = ReviewPlatform | "ask";

type DashboardSettingsDialogProps = {
	platformPreference: ReviewPlatform | null;
	onPlatformPreferenceChange: (preference: ReviewPlatform | null) => void;
};

export function DashboardSettingsDialog({
	platformPreference,
	onPlatformPreferenceChange,
}: DashboardSettingsDialogProps) {
	const router = useRouter();
	const session = authClient.useSession();
	const [open, setOpen] = useState(false);
	const [isSigningOut, setIsSigningOut] = useState(false);
	const platformSettingId = useId();
	const user = session.data?.user;
	const initials = getInitials(user?.name ?? user?.email ?? "User");
	const platformValue = platformPreference ?? "ask";

	function handlePlatformChange(value: string) {
		if (value === "leetcode" || value === "neetcode") {
			onPlatformPreferenceChange(value);
			return;
		}
		onPlatformPreferenceChange(null);
	}

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
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<button
					type="button"
					aria-label="Open settings"
					className="inline-flex size-9 shrink-0 items-center justify-center rounded border border-white/15 text-white/65 transition-colors duration-150 ease-out hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
				>
					<Settings className="size-4" />
				</button>
			</DialogTrigger>
			<DialogContent className="border-white/10 bg-[#11121a] text-[#ededf5] sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="text-lg text-[#ededf5]">Settings</DialogTitle>
					<DialogDescription className="text-sm text-white/55">
						Account and Random Review preferences.
					</DialogDescription>
				</DialogHeader>

				<section className="rounded border border-white/10 bg-white/[0.03] p-4">
					<div className="flex items-center gap-3">
						<Avatar size="lg" className="border border-white/10 bg-white/5">
							{user?.image ? (
								<AvatarImage src={user.image} alt={user.name ?? "User"} />
							) : null}
							<AvatarFallback className="bg-white/10 text-white/75">
								{initials}
							</AvatarFallback>
						</Avatar>
						<div className="min-w-0">
							<p className="truncate text-sm font-medium text-white/85">
								{user?.name ?? "Signed in"}
							</p>
							<p className="truncate text-xs text-white/45">
								{user?.email ?? "Loading account..."}
							</p>
						</div>
					</div>
				</section>

				<section className="rounded border border-white/10 bg-white/[0.03] p-4">
					<div className="mb-3">
						<h2 className="text-sm font-medium text-white/85">
							Random Review platform
						</h2>
						<p className="mt-1 text-xs text-white/45">
							Used when a selected problem is available on both platforms.
						</p>
					</div>
					<RadioGroup
						value={platformValue}
						onValueChange={handlePlatformChange}
						aria-labelledby={platformSettingId}
						className="gap-2"
					>
						<span id={platformSettingId} className="sr-only">
							Random Review platform preference
						</span>
						<PlatformOption
							value="ask"
							label="Ask every time"
							description="Choose LeetCode or NeetCode for each dual-platform problem."
							checked={platformValue === "ask"}
						/>
						<PlatformOption
							value="leetcode"
							label="LeetCode"
							description="Open LeetCode automatically when both links exist."
							checked={platformValue === "leetcode"}
						/>
						<PlatformOption
							value="neetcode"
							label="NeetCode"
							description="Open NeetCode automatically when both links exist."
							checked={platformValue === "neetcode"}
						/>
					</RadioGroup>
				</section>

				<button
					type="button"
					onClick={handleSignOut}
					disabled={isSigningOut}
					className="inline-flex transform-gpu items-center justify-center gap-2 rounded border border-red-500/25 bg-red-500/[0.06] px-3 py-2 text-sm text-red-200 transition-colors duration-150 ease-out hover:border-red-400/40 hover:bg-red-500/12 disabled:cursor-not-allowed disabled:opacity-60"
				>
					<LogOut className="size-4" />
					{isSigningOut ? "Signing out..." : "Log out"}
				</button>
			</DialogContent>
		</Dialog>
	);
}

function PlatformOption({
	value,
	label,
	description,
	checked,
}: {
	value: PlatformSettingValue;
	label: string;
	description: string;
	checked: boolean;
}) {
	const optionId = useId();

	return (
		<label
			htmlFor={optionId}
			className="flex cursor-pointer items-start gap-3 rounded border border-white/10 px-3 py-2 transition-colors duration-150 ease-out hover:bg-white/[0.04]"
		>
			<RadioGroupItem
				id={optionId}
				value={value}
				className="mt-0.5 border-white/25 text-emerald-300 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500/20 [&_svg]:fill-emerald-300"
			/>
			<span className="min-w-0">
				<span className="block text-sm text-white/80">{label}</span>
				<span className="block text-xs leading-5 text-white/45">
					{description}
				</span>
			</span>
			{checked ? (
				<span className="ml-auto rounded border border-emerald-400/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-emerald-200/75">
					Active
				</span>
			) : null}
		</label>
	);
}

function getInitials(label: string) {
	const parts = label.trim().split(/\s+/).filter(Boolean);
	const initials = parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");

	return initials || "U";
}
