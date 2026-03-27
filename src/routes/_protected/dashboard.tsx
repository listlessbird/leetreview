import {
	type ColumnDef,
	type PaginationState,
	type SortingState,
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import {
	ClientOnly,
	createFileRoute,
	Link,
	useRouter,
} from "@tanstack/react-router";
import { Search } from "lucide-react";
import * as React from "react";
import { SiLeetcode } from "react-icons/si";
import { AddProblemDialog } from "@/components/dashboard/AddProblemDialog";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { useAdaptiveNow } from "@/hooks/use-adaptive-now";
import { formatDueExact, formatDueRelative } from "@/lib/due-date";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { BadgeOverflow } from "@/components/ui/badge-overflow";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { getDueCards } from "@/lib/review.functions";

export const Route = createFileRoute("/_protected/dashboard")({
	loader: async () => getDueCards(),
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary
			error={error}
			reset={reset}
			title="Couldn't load dashboard"
		/>
	),
	component: DashboardPage,
});

function DashboardPage() {
	const router = useRouter();
	const dueCards = Route.useLoaderData();
	const [search, setSearch] = React.useState("");
	const deferredSearch = React.useDeferredValue(search.trim().toLowerCase());
	const [sorting, setSorting] = React.useState<SortingState>([
		{ id: "difficulty", desc: true },
		{ id: "due", desc: false },
	]);
	const [pagination, setPagination] = React.useState<PaginationState>({
		pageIndex: 0,
		pageSize: 10,
	});
	const searchableRows = React.useMemo(
		() =>
			dueCards.map((card) => ({
				card,
				searchText:
					`${card.title} ${card.difficulty} ${card.tags.join(" ")}`.toLowerCase(),
			})),
		[dueCards],
	);
	const filteredDueCards = React.useMemo(() => {
		if (!deferredSearch) return dueCards;
		return searchableRows
			.filter(({ searchText }) => searchText.includes(deferredSearch))
			.map(({ card }) => card);
	}, [deferredSearch, dueCards, searchableRows]);
	const nowMs = useAdaptiveNow(filteredDueCards.map((card) => card.due));
	React.useEffect(() => {
		setPagination((prev) =>
			prev.pageIndex === 0 ? prev : { ...prev, pageIndex: 0 },
		);
	}, [deferredSearch]);
	const columns = React.useMemo<ColumnDef<(typeof dueCards)[number]>[]>(
		() => [
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
				id: "action",
				enableSorting: false,
				header: "Action",
				cell: ({ row }) => (
					<Link
						to="/review/$cardId"
						params={{ cardId: row.original.cardId }}
						className="transform-gpu rounded border border-white/20 px-3 py-2 text-sm transition-colors duration-150 ease-out hover:bg-white/10 active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none"
					>
						Review
					</Link>
				),
			},
		],
		[],
	);
	const table = useReactTable({
		data: filteredDueCards,
		columns,
		state: {
			sorting,
			pagination,
		},
		getRowId: (row) => row.cardId,
		enableRowSelection: false,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">
						Today's Due Reviews
					</h1>
					<div className="flex items-center gap-3 text-sm">
						<AddProblemDialog onAdded={() => router.invalidate()} />
						<Link
							className="underline decoration-white/30 underline-offset-4"
							to="/problems"
						>
							All problems
						</Link>
					</div>
				</header>

				{dueCards.length === 0 ? (
					<div className="rounded border border-white/10 bg-white/5 p-5 text-sm text-white/70">
						No problems are due right now.
					</div>
				) : (
					<>
						<div className="flex items-center justify-between gap-3">
							<div className="relative w-full max-w-sm">
								<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 size-4 text-white/45" />
								<Input
									value={search}
									onChange={(event) => setSearch(event.target.value)}
									placeholder="Search title, difficulty, tags..."
									className="h-9 border-white/20 bg-white/[0.03] pl-8 text-[#ededf5] placeholder:text-white/45 focus-visible:border-white/30 focus-visible:ring-white/20"
									aria-label="Search due reviews"
								/>
							</div>
							{deferredSearch ? (
								<p className="whitespace-nowrap text-sm text-white/60">
									{filteredDueCards.length} result
									{filteredDueCards.length === 1 ? "" : "s"}
								</p>
							) : null}
						</div>
						<DataTable
							table={table}
							showSelectionSummary={false}
							className="[&_.data-table-shell]:border-white/10 [&_.data-table-shell]:bg-white/5 [&_[data-slot=table]]:min-w-[940px] [&_[data-slot=table-body]_tr]:border-white/10 [&_[data-slot=table-cell]]:p-3 [&_[data-slot=table-cell]:nth-child(2)]:w-12 [&_[data-slot=table-cell]:nth-child(2)]:py-2 [&_[data-slot=table-head]:nth-child(2)]:w-12 [&_[data-slot=table-head]:nth-child(2)]:py-2 [&_[data-slot=table-head]]:p-3 [&_[data-slot=table-head]]:text-xs [&_[data-slot=table-head]]:tracking-wide [&_[data-slot=table-head]]:uppercase [&_[data-slot=table-head]]:text-white/60 [&_[data-slot=table-header]_tr]:border-white/10"
						/>
					</>
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
	return (
		<ClientOnly fallback={formatUtcFallback(dueUnix)}>
			<LocalDueDate dueUnix={dueUnix} nowMs={nowMs} />
		</ClientOnly>
	);
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
