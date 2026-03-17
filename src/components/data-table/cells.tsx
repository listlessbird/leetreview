import { ClientOnly } from "@tanstack/react-router";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { BadgeOverflow } from "@/components/ui/badge-overflow";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatDueExact, formatDueRelative } from "@/lib/due-date";

export const DIFFICULTY_RANK: Record<string, number> = {
	EASY: 1,
	MEDIUM: 2,
	HARD: 3,
};

const LOCAL_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

function formatUtcFallback(dueUnix: number) {
	return `${UTC_DATE_TIME_FORMATTER.format(new Date(dueUnix * 1000))} (UTC)`;
}

export function DueDateCell({
	dueUnix,
	nowMs,
}: { dueUnix: number; nowMs: number }) {
	return (
		<ClientOnly fallback={formatUtcFallback(dueUnix)}>
			<LocalDueDate dueUnix={dueUnix} nowMs={nowMs} />
		</ClientOnly>
	);
}

function LocalDueDate({
	dueUnix,
	nowMs,
}: { dueUnix: number; nowMs: number }) {
	const dueDate = React.useMemo(() => new Date(dueUnix * 1000), [dueUnix]);
	const relative = React.useMemo(
		() => formatDueRelative(dueDate, new Date(nowMs)),
		[dueDate, nowMs],
	);
	const exact = React.useMemo(
		() => `${formatDueExact(dueDate)} (${LOCAL_TIMEZONE})`,
		[dueDate],
	);

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span className="cursor-help text-white/80">{relative}</span>
			</TooltipTrigger>
			<TooltipContent
				sideOffset={6}
				className="border border-white/15 bg-[#0d0d16] text-[#ededf5]"
			>
				{exact}
			</TooltipContent>
		</Tooltip>
	);
}

function renderTagBadge(_: string, label: string) {
	return (
		<Badge
			variant="outline"
			className="h-5 border-white/15 bg-transparent px-1.5 text-[11px] text-white/70"
		>
			{label}
		</Badge>
	);
}

function renderTagOverflow(count: number) {
	return (
		<Badge
			variant="outline"
			className="h-5 border-white/20 bg-white/[0.04] px-1.5 text-[11px] text-white/80"
		>
			+{count}
		</Badge>
	);
}

export function TagsCell({ tags }: { tags: string[] }) {
	const fullTags = tags.join(", ");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="max-w-[22rem] cursor-help">
					<BadgeOverflow
						items={tags}
						lineCount={2}
						renderBadge={renderTagBadge}
						renderOverflow={renderTagOverflow}
					/>
				</div>
			</TooltipTrigger>
			<TooltipContent
				sideOffset={6}
				className="max-w-[32rem] border border-white/15 bg-[#0d0d16] text-[#ededf5]"
			>
				{fullTags || "No tags"}
			</TooltipContent>
		</Tooltip>
	);
}
