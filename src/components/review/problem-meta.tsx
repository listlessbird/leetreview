"use client";

import * as React from "react";
import { SiLeetcode } from "react-icons/si";

import { Badge } from "@/components/ui/badge";
import { BadgeOverflow } from "@/components/ui/badge-overflow";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipPopup, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDueExact, formatDueRelative } from "@/lib/due-date";
import { cn } from "@/lib/utils";

const DIFFICULTY_TONES: Record<string, string> = {
	EASY: "text-success-foreground",
	MEDIUM: "text-warning-foreground",
	HARD: "text-destructive-foreground",
};

export const DIFFICULTY_RANK: Record<string, number> = {
	EASY: 1,
	MEDIUM: 2,
	HARD: 3,
};

export function difficultyRank(difficulty: string) {
	return DIFFICULTY_RANK[difficulty.trim().toUpperCase()] ?? 0;
}

/** Difficulty as a small coloured mono label. */
export function Difficulty({
	difficulty,
	className,
}: {
	difficulty: string;
	className?: string;
}) {
	return (
		<span
			className={cn(
				"font-mono text-2xs uppercase tracking-wide",
				DIFFICULTY_TONES[difficulty.trim().toUpperCase()] ??
					"text-muted-foreground",
				className,
			)}
		>
			{difficulty}
		</span>
	);
}

/** A coloured dot for dense lists where the full label does not fit. */
export function DifficultyDot({ difficulty }: { difficulty: string }) {
	return (
		<span
			aria-hidden
			className={cn(
				"size-1.5 shrink-0 rounded-full bg-current",
				DIFFICULTY_TONES[difficulty.trim().toUpperCase()] ??
					"text-muted-foreground",
			)}
		/>
	);
}

/** Icon buttons opening the problem on LeetCode and, when linked, NeetCode. */
export function PlatformLinks({
	title,
	url,
	neetcodeUrl,
}: {
	title: string;
	url: string;
	neetcodeUrl: string | null;
}) {
	return (
		<div className="flex items-center gap-1">
			<Button
				size="icon-sm"
				variant="outline"
				aria-label={`Open ${title} on LeetCode`}
				className="hover:text-[#FFA116]"
				// biome-ignore lint/a11y/useAnchorContent: Button renders its children and aria-label into the anchor
				render={<a href={url} target="_blank" rel="noopener noreferrer" />}
			>
				<SiLeetcode className="size-3.5" />
			</Button>
			{neetcodeUrl ? (
				<Button
					size="icon-sm"
					variant="outline"
					aria-label={`Open ${title} on NeetCode`}
					className="font-mono text-3xs hover:text-success-foreground"
					render={
						// biome-ignore lint/a11y/useAnchorContent: Button renders its children and aria-label into the anchor
						<a href={neetcodeUrl} target="_blank" rel="noopener noreferrer" />
					}
				>
					NC
				</Button>
			) : null}
		</div>
	);
}

/** Tags clamped to `lineCount` lines with a "+n" overflow and a full-list tooltip. */
export function TagList({
	tags,
	lineCount = 2,
	className,
}: {
	tags: string[];
	lineCount?: number;
	className?: string;
}) {
	if (tags.length === 0) {
		return <span className="text-muted-foreground text-xs">—</span>;
	}

	return (
		<Tooltip>
			<TooltipTrigger
				render={<div className={cn("max-w-[22rem] cursor-help", className)} />}
			>
				<BadgeOverflow
					items={tags}
					lineCount={lineCount}
					renderBadge={(_, label) => (
						<Badge variant="outline" className="font-mono">
							{label}
						</Badge>
					)}
					renderOverflow={(count) => (
						<Badge variant="secondary" className="font-mono">
							+{count}
						</Badge>
					)}
				/>
			</TooltipTrigger>
			<TooltipPopup className="max-w-[32rem]">{tags.join(", ")}</TooltipPopup>
		</Tooltip>
	);
}

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

/**
 * Relative due time with the exact local time in a tooltip. Renders a UTC
 * timestamp until hydrated so server and client markup agree.
 */
export function DueDate({
	dueUnix,
	nowMs,
	className,
}: {
	dueUnix: number;
	nowMs: number;
	className?: string;
}) {
	const isClient = React.useSyncExternalStore(
		noopSubscribe,
		() => true,
		() => false,
	);
	const dueDate = new Date(dueUnix * 1000);

	if (!isClient) {
		return (
			<span className={cn("font-mono text-xs", className)}>
				{UTC_DATE_TIME_FORMATTER.format(dueDate)} (UTC)
			</span>
		);
	}

	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	return (
		<Tooltip>
			<TooltipTrigger
				render={
					<span
						className={cn(
							"cursor-help font-mono text-muted-foreground text-xs",
							className,
						)}
					/>
				}
			>
				{formatDueRelative(dueDate, new Date(nowMs))}
			</TooltipTrigger>
			<TooltipPopup>
				{formatDueExact(dueDate)} ({timeZone})
			</TooltipPopup>
		</Tooltip>
	);
}

const noopSubscribe = () => () => {};
