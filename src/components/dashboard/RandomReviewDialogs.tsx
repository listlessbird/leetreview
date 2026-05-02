"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { ExternalLink, Shuffle } from "lucide-react";
import { useId } from "react";
import { SiLeetcode } from "react-icons/si";

import { EditProblemButton } from "@/components/problems/EditProblemDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import type {
	RandomReviewSession as RandomReviewSessionModel,
	ReviewPlatform,
} from "@/lib/random-review";
import type { DueCard } from "@/lib/review.functions";
import { cn } from "@/lib/utils";

export type RandomReviewSession = RandomReviewSessionModel<DueCard>;

type PlatformChoiceDialogProps = {
	problem: DueCard | null;
	remember: boolean;
	onRememberChange: (remember: boolean) => void;
	onChoose: (platform: ReviewPlatform) => void;
	onCancel: () => void;
};

export function PlatformChoiceDialog({
	problem,
	remember,
	onRememberChange,
	onChoose,
	onCancel,
}: PlatformChoiceDialogProps) {
	const rememberPreferenceId = useId();

	return (
		<Dialog open={Boolean(problem)} onOpenChange={() => undefined}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
				className="border-white/10 bg-[#11121a] text-[#ededf5] sm:max-w-md"
			>
				<DialogHeader>
					<DialogTitle className="text-lg text-[#ededf5]">
						Choose platform
					</DialogTitle>
					<DialogDescription className="text-sm text-white/55">
						{problem
							? `${problem.title} is available on both platforms.`
							: "This problem is available on both platforms."}
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 sm:grid-cols-2">
					<PlatformButton
						platform="leetcode"
						label="LeetCode"
						onClick={() => onChoose("leetcode")}
					/>
					<PlatformButton
						platform="neetcode"
						label="NeetCode"
						onClick={() => onChoose("neetcode")}
					/>
				</div>
				<label
					htmlFor={rememberPreferenceId}
					className="flex items-center gap-2 text-sm text-white/70"
				>
					<Checkbox
						id={rememberPreferenceId}
						checked={remember}
						onCheckedChange={(checked) => onRememberChange(checked === true)}
						className="border-white/25 bg-white/5 data-[state=checked]:border-emerald-400 data-[state=checked]:bg-emerald-500/90"
					/>
					<span>Remember this option</span>
				</label>
				<button
					type="button"
					onClick={onCancel}
					className="justify-self-start rounded border border-white/15 px-3 py-1.5 text-sm text-white/60 transition-colors duration-150 ease-out hover:bg-white/8 hover:text-white"
				>
					Cancel
				</button>
			</DialogContent>
		</Dialog>
	);
}

type RandomReviewSessionDialogProps = {
	session: RandomReviewSession | null;
	isSubmitting: boolean;
	error: string | null;
	onRate: (rating: 1 | 2 | 3 | 4) => void;
	onOpenAgain: () => void;
	onSkip: () => void;
};

function RandomReviewHotkeys({
	onRate,
	isSubmitting,
}: {
	onRate: (rating: 1 | 2 | 3 | 4) => void;
	isSubmitting: boolean;
}) {
	useHotkey(
		HOTKEYS.rateAgain,
		() => {
			if (!isSubmitting) onRate(1);
		},
		{
			ignoreInputs: true,
			meta: {
				name: "Random review: Again",
				description: "Submit Again rating",
			},
		},
	);
	useHotkey(
		HOTKEYS.rateHard,
		() => {
			if (!isSubmitting) onRate(2);
		},
		{
			ignoreInputs: true,
			meta: { name: "Random review: Hard", description: "Submit Hard rating" },
		},
	);
	useHotkey(
		HOTKEYS.rateGood,
		() => {
			if (!isSubmitting) onRate(3);
		},
		{
			ignoreInputs: true,
			meta: { name: "Random review: Good", description: "Submit Good rating" },
		},
	);
	useHotkey(
		HOTKEYS.rateEasy,
		() => {
			if (!isSubmitting) onRate(4);
		},
		{
			ignoreInputs: true,
			meta: { name: "Random review: Easy", description: "Submit Easy rating" },
		},
	);
	return null;
}

export function RandomReviewSessionDialog({
	session,
	isSubmitting,
	error,
	onRate,
	onOpenAgain,
	onSkip,
}: RandomReviewSessionDialogProps) {
	const canSubmit = Boolean(session) && !isSubmitting;

	return (
		<Dialog open={Boolean(session)} onOpenChange={() => undefined}>
			<DialogContent
				showCloseButton={false}
				onEscapeKeyDown={(event) => event.preventDefault()}
				onInteractOutside={(event) => event.preventDefault()}
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto border-white/10 bg-[#11121a] p-4 text-[#ededf5] sm:max-w-2xl sm:p-6"
			>
				{session ? (
					<>
						<RandomReviewHotkeys onRate={onRate} isSubmitting={isSubmitting} />
						<DialogHeader>
							<div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
								<div className="min-w-0 flex-1">
									<div className="flex min-w-0 items-start gap-2">
										<DialogTitle className="min-w-0 text-lg leading-tight text-[#ededf5] [overflow-wrap:anywhere] sm:text-xl">
											{session.problem.title}
										</DialogTitle>
										<EditProblemButton
											problemId={session.problem.problemId}
											title={session.problem.title}
											url={session.problem.url}
											neetcodeUrl={session.problem.neetcodeUrl}
											tags={session.problem.tags}
											className="mt-0.5"
										/>
									</div>
									<DialogDescription className="mt-1 text-sm text-white/55">
										Score this Random Review Session when you return.
									</DialogDescription>
								</div>
								<PlatformBadge platform={session.platform} />
							</div>
						</DialogHeader>
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded border border-white/15 px-2 py-1 text-xs uppercase tracking-wide text-white/65">
								{session.problem.difficulty}
							</span>
							{session.problem.tags.slice(0, 6).map((tag) => (
								<span
									key={tag}
									className="rounded border border-white/10 px-2 py-1 text-xs text-white/55"
								>
									{tag}
								</span>
							))}
						</div>
						<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
							<RatingButton
								label="Again"
								hint="couldn't derive without major hint"
								hotkey={HOTKEY_LABELS.rateAgain[0]}
								disabled={!canSubmit}
								onClick={() => onRate(1)}
								className="hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-200"
							/>
							<RatingButton
								label="Hard"
								hint="solved, but slow or shaky"
								hotkey={HOTKEY_LABELS.rateHard[0]}
								disabled={!canSubmit}
								onClick={() => onRate(2)}
								className="hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-200"
							/>
							<RatingButton
								label="Good"
								hint="solved cleanly after thinking"
								hotkey={HOTKEY_LABELS.rateGood[0]}
								disabled={!canSubmit}
								onClick={() => onRate(3)}
								className="hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-200"
							/>
							<RatingButton
								label="Easy"
								hint="recognized pattern, can code it"
								hotkey={HOTKEY_LABELS.rateEasy[0]}
								disabled={!canSubmit}
								onClick={() => onRate(4)}
								className="hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-200"
							/>
						</div>
						{error ? (
							<p className="rounded border border-red-500/20 bg-red-500/6 px-3 py-2 text-sm text-red-300">
								{error}
							</p>
						) : null}
						<div className="grid gap-2 sm:grid-cols-2">
							<button
								type="button"
								onClick={onOpenAgain}
								className="inline-flex min-w-0 items-center justify-center gap-2 rounded border border-white/15 px-3 py-2 text-sm text-white/70 transition-colors duration-150 ease-out hover:bg-white/8 hover:text-white sm:justify-self-start"
							>
								<ExternalLink className="size-4 shrink-0" />
								<span className="truncate">Open again</span>
							</button>
							<button
								type="button"
								onClick={onSkip}
								disabled={isSubmitting}
								className="inline-flex min-w-0 items-center justify-center gap-2 rounded border border-white/15 px-3 py-2 text-sm text-white/60 transition-colors duration-150 ease-out hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:justify-self-end"
							>
								<Shuffle className="size-4 shrink-0" />
								<span className="truncate">Skip / choose another</span>
							</button>
						</div>
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function PlatformButton({
	platform,
	label,
	onClick,
}: {
	platform: ReviewPlatform;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center justify-center gap-2 rounded border border-white/15 bg-white/[0.03] px-3 py-4 text-sm font-medium text-white/80 transition-colors duration-150 ease-out hover:border-white/30 hover:bg-white/8 hover:text-white"
		>
			{platform === "leetcode" ? (
				<SiLeetcode className="size-4 text-[#FFA116]" />
			) : (
				<span className="text-xs font-bold leading-none text-emerald-300">
					NC
				</span>
			)}
			{label}
		</button>
	);
}

function PlatformBadge({ platform }: { platform: ReviewPlatform }) {
	return (
		<span className="inline-flex shrink-0 items-center gap-1.5 rounded border border-white/15 bg-white/[0.03] px-2 py-1 text-xs text-white/65">
			{platform === "leetcode" ? (
				<SiLeetcode className="size-3.5 text-[#FFA116]" />
			) : (
				<span className="text-[10px] font-bold leading-none text-emerald-300">
					NC
				</span>
			)}
			{platform === "leetcode" ? "LeetCode" : "NeetCode"}
		</span>
	);
}

function RatingButton({
	label,
	hint,
	hotkey,
	disabled,
	onClick,
	className,
}: {
	label: string;
	hint: string;
	hotkey: string;
	disabled: boolean;
	onClick: () => void;
	className: string;
}) {
	return (
		<button
			type="button"
			disabled={disabled}
			onClick={onClick}
			className={cn(
				"flex w-full transform-gpu flex-col items-center justify-center gap-1 rounded border border-white/20 px-3 py-2.5 text-sm text-white/75 transition-colors duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transform-none motion-reduce:transition-none",
				className,
			)}
		>
			<div className="flex items-center gap-2">
				{label}
				<Kbd className="border border-white/15 bg-white/8 text-[10px] text-white/45">
					{hotkey}
				</Kbd>
			</div>
			<span className="text-center text-[10px] font-normal leading-tight text-white/35">
				{hint}
			</span>
		</button>
	);
}
