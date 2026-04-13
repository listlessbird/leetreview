"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import {
	type ColumnDef,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { SiLeetcode } from "react-icons/si";

import { ReviewRowContent } from "@/components/review/ReviewRowContent";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { BadgeOverflow } from "@/components/ui/badge-overflow";
import { Input } from "@/components/ui/input";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdaptiveNow } from "@/hooks/use-adaptive-now";
import { useRowNavHotkeys } from "@/hooks/use-row-hotkeys";
import { formatDueExact, formatDueRelative } from "@/lib/due-date";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import {
	fetchProblems,
	type ProblemRow,
	reviewQueryKeys,
} from "@/lib/review.functions";

export function ProblemsPage() {
	const [reviewCardId, setReviewCardId] = React.useState<string | null>(null);
	const searchInputRef = React.useRef<HTMLInputElement>(null);
	const [search, setSearch] = React.useState("");
	const {
		data: problems = [],
		error,
		isLoading,
	} = useQuery({
		queryKey: reviewQueryKeys.problems,
		queryFn: fetchProblems,
		staleTime: 30_000,
	});
	const deferredSearch = React.useDeferredValue(search.trim().toLowerCase());
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: "difficulty", desc: true },
		{ id: "title", desc: false },
	]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const searchableRows = React.useMemo(
		() =>
			problems.map((problem) => ({
				problem,
				searchText:
					`${problem.title} ${problem.slug} ${problem.difficulty} ${problem.tags.join(" ")}`.toLowerCase(),
			})),
		[problems],
	);
	const filteredProblems = React.useMemo(() => {
		if (!deferredSearch) return problems;
		return searchableRows.flatMap(({ searchText, problem }) =>
			searchText.includes(deferredSearch) ? [problem] : [],
		);
	}, [deferredSearch, problems, searchableRows]);
	const dueUnixList = React.useMemo(
		() => filteredProblems.map((problem) => problem.due),
		[filteredProblems],
	);
	const nowMs = useAdaptiveNow(dueUnixList);

	function handleSearchChange(value: string) {
		setSearch(value);
		setPagination((prev) =>
			prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
		);
	}

	// ── Hotkeys ────────────────────────────────────────────────────────────
	useHotkey(
		HOTKEYS.searchFocus,
		() => {
			searchInputRef.current?.focus();
			searchInputRef.current?.select();
		},
		{
			preventDefault: true,
			meta: { name: "Focus search", description: "Focus the search input" },
		},
	);

	const columns = React.useMemo<ColumnDef<ProblemRow>[]>(
		() => [
			{
				id: "rowNum",
				enableSorting: false,
				enableHiding: false,
				header: () => null,
				cell: ({ row, table }) => {
					const num =
						table.getRowModel().rows.findIndex((r) => r.id === row.id) + 1;
					return (
						<Kbd className="border border-white/15 bg-white/8 text-[10px] text-white/45">{num}</Kbd>
					);
				},
				meta: { label: "#" },
			},
			{
				id: "title",
				accessorKey: "title",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Title" />
				),
				cell: ({ row }) => (
					<div className="max-w-[30rem] truncate font-medium">
						{row.original.title}
					</div>
				),
			},
			{
				id: "open",
				enableSorting: false,
				enableHiding: false,
				header: () => <span className="sr-only">Open</span>,
				cell: ({ row }) => (
					<a
						href={row.original.url}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Open ${row.original.title} on LeetCode`}
						className="inline-flex size-8 items-center justify-center rounded border border-white/15 text-white/70 transition-colors duration-150 ease-out hover:border-white/30 hover:bg-white/10 hover:text-[#FFA116] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30"
					>
						<SiLeetcode className="size-3.5" />
					</a>
				),
				meta: {
					label: "Open",
				},
			},
			{
				id: "difficulty",
				accessorFn: (row) =>
					DIFFICULTY_RANK[row.difficulty.trim().toUpperCase()] ?? 0,
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Difficulty" />
				),
				cell: ({ row }) => (
					<span className="text-xs uppercase tracking-wide text-white/70">
						{row.original.difficulty}
					</span>
				),
			},
			{
				id: "tags",
				accessorFn: (row) => row.tags.join(", "),
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Tags" />
				),
				cell: ({ row }) => <TagsCell tags={row.original.tags} />,
			},
			{
				id: "due",
				accessorKey: "due",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Due" />
				),
				cell: ({ row }) => (
					<DueDateCell dueUnix={row.original.due} nowMs={nowMs} />
				),
			},
			{
				id: "reps",
				accessorKey: "reps",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Reps" />
				),
			},
			{
				id: "action",
				enableSorting: false,
				header: "Action",
				cell: ({ row }) => (
					<button
						type="button"
						onClick={() => setReviewCardId(
							reviewCardId === row.original.cardId ? null : row.original.cardId
						)}
						className="transform-gpu rounded border border-white/20 px-2.5 py-1.5 text-sm transition-colors duration-150 ease-out hover:bg-white/10 active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none"
					>
						Review
					</button>
				),
			},
		],
		[nowMs, reviewCardId],
	);

	const table = useReactTable({
		data: filteredProblems,
		columns,
		state: {
			sorting,
			pagination,
		},
		getRowId: (row) => row.problemId,
		enableRowSelection: false,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	const pageRows = table
		.getRowModel()
		.rows.map((row) => ({
			onSelect: () => setReviewCardId(
				reviewCardId === row.original.cardId ? null : row.original.cardId,
			),
		}));
	useRowNavHotkeys(pageRows);

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">
						Tracked Problems
					</h1>
					<Link
						className="text-sm underline decoration-white/30 underline-offset-4"
						href="/dashboard"
					>
						Back to dashboard
					</Link>
				</div>
				<div className="flex items-center justify-between gap-3">
					<div className="relative w-full max-w-sm">
						<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-white/45" />
						<Input
							ref={searchInputRef}
							value={search}
							onChange={(event) => handleSearchChange(event.target.value)}
							placeholder="Search title, slug, difficulty, tags..."
							className="h-9 border-white/20 bg-white/[0.03] pl-8 pr-16 text-[#ededf5] placeholder:text-white/45 focus-visible:border-white/30 focus-visible:ring-white/20"
							aria-label="Search tracked problems"
						/>
						<KbdGroup className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2">
							{HOTKEY_LABELS.searchFocus.map((key) => (
								<Kbd key={key} className="border border-white/15 bg-white/8 text-[10px] text-white/50">
									{key}
								</Kbd>
							))}
						</KbdGroup>
					</div>
					{deferredSearch ? (
						<p className="whitespace-nowrap text-sm text-white/60">
							{filteredProblems.length} result
							{filteredProblems.length === 1 ? "" : "s"}
						</p>
					) : null}
				</div>
				{isLoading ? (
					<div className="rounded border border-white/10 bg-white/5 p-5 text-sm text-white/70">
						Loading tracked problems...
					</div>
				) : error ? (
					<div className="rounded border border-red-500/20 bg-red-500/6 p-5 text-sm text-red-200">
						{error instanceof Error
							? error.message
							: "Could not load tracked problems."}
					</div>
				) : (
					<DataTable
						table={table}
						showSelectionSummary={false}
						className="[&_.data-table-shell]:border-white/10 [&_.data-table-shell]:bg-white/5 [&_[data-slot=table]]:min-w-[820px] [&_[data-slot=table-body]_tr]:border-white/10 [&_[data-slot=table-cell]]:p-3 [&_[data-slot=table-cell]:nth-child(2)]:w-12 [&_[data-slot=table-cell]:nth-child(2)]:py-2 [&_[data-slot=table-head]:nth-child(2)]:w-12 [&_[data-slot=table-head]:nth-child(2)]:py-2 [&_[data-slot=table-head]]:p-3 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:tracking-wide [&_[data-slot=table-head]]:uppercase [&_[data-slot=table-head]]:text-white/60 [&_[data-slot=table-header]_tr]:border-white/10"
						isRowExpanded={(row) => reviewCardId === row.original.cardId}
						renderExpandedRow={(row) => (
							<ReviewRowContent
								cardId={row.original.cardId}
								onClose={() => setReviewCardId(null)}
							/>
						)}
					/>
				)}
			</div>
		</div>
	);
}

const DIFFICULTY_RANK: Record<string, number> = {
	EASY: 1,
	MEDIUM: 2,
	HARD: 3,
};

function DueDateCell({ dueUnix, nowMs }: { dueUnix: number; nowMs: number }) {
	const [isClient, setIsClient] = React.useState(false);

	React.useEffect(() => {
		setIsClient(true);
	}, []);

	if (!isClient) {
		return formatUtcFallback(dueUnix);
	}

	return <LocalDueDate dueUnix={dueUnix} nowMs={nowMs} />;
}

const UTC_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
	dateStyle: "medium",
	timeStyle: "short",
	timeZone: "UTC",
});

function formatUtcFallback(dueUnix: number) {
	return `${UTC_DATE_TIME_FORMATTER.format(new Date(dueUnix * 1000))} (UTC)`;
}

function LocalDueDate({ dueUnix, nowMs }: { dueUnix: number; nowMs: number }) {
	const dueDate = React.useMemo(() => new Date(dueUnix * 1000), [dueUnix]);
	const relative = React.useMemo(
		() => formatDueRelative(dueDate, new Date(nowMs)),
		[dueDate, nowMs],
	);
	const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const exact = React.useMemo(
		() => `${formatDueExact(dueDate)} (${timeZone})`,
		[dueDate, timeZone],
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

function TagsCell({ tags }: { tags: string[] }) {
	const fullTags = tags.join(", ");

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<div className="max-w-[22rem] cursor-help">
					<BadgeOverflow
						items={tags}
						lineCount={2}
						renderBadge={(_, label) => (
							<Badge
								variant="outline"
								className="h-5 border-white/15 bg-transparent px-1.5 text-[11px] text-white/70"
							>
								{label}
							</Badge>
						)}
						renderOverflow={(count) => (
							<Badge
								variant="outline"
								className="h-5 border-white/20 bg-white/[0.04] px-1.5 text-[11px] text-white/80"
							>
								+{count}
							</Badge>
						)}
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
