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
import * as React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { EditProblemButton } from "@/components/problems/EditProblemDialog";
import {
	Difficulty,
	DueDate,
	difficultyRank,
	PlatformLinks,
	TagList,
} from "@/components/review/problem-meta";
import { ReviewRowContent } from "@/components/review/ReviewRowContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Spinner } from "@/components/ui/spinner";
import { useAdaptiveNow } from "@/hooks/use-adaptive-now";
import { useRowNavHotkeys } from "@/hooks/use-row-hotkeys";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import {
	fetchProblems,
	type ProblemRow,
	reviewQueryKeys,
} from "@/lib/review.functions";

/** Every tracked problem in a sortable table with inline rating. */
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
	const filteredProblems = React.useMemo(() => {
		if (!deferredSearch) return problems;
		return problems.filter((problem) =>
			`${problem.title} ${problem.slug} ${problem.difficulty} ${problem.tags.join(" ")}`
				.toLowerCase()
				.includes(deferredSearch),
		);
	}, [deferredSearch, problems]);
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

	const toggleReview = React.useCallback((cardId: string) => {
		setReviewCardId((current) => (current === cardId ? null : cardId));
	}, []);

	useHotkey(
		HOTKEYS.searchFocus,
		() => {
			searchInputRef.current?.focus();
			searchInputRef.current?.select();
		},
		{
			ignoreInputs: true,
			preventDefault: true,
			meta: { name: "Focus search", description: "Focus the search input" },
		},
	);

	const columns = React.useMemo<ColumnDef<ProblemRow>[]>(
		() => [
			{
				id: "rowNum",
				enableSorting: false,
				header: () => null,
				cell: ({ row, table }) => (
					<Kbd className="font-mono">
						{table.getRowModel().rows.findIndex((r) => r.id === row.id) + 1}
					</Kbd>
				),
			},
			{
				id: "title",
				accessorKey: "title",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Title" />
				),
				cell: ({ row }) => (
					<div className="flex max-w-[30rem] items-center gap-1.5">
						<span className="truncate font-medium">{row.original.title}</span>
						<EditProblemButton {...row.original} hoverReveal />
					</div>
				),
			},
			{
				id: "open",
				enableSorting: false,
				header: () => <span className="sr-only">Open</span>,
				cell: ({ row }) => <PlatformLinks {...row.original} />,
			},
			{
				id: "difficulty",
				accessorFn: (row) => difficultyRank(row.difficulty),
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Difficulty" />
				),
				cell: ({ row }) => <Difficulty difficulty={row.original.difficulty} />,
			},
			{
				id: "tags",
				accessorFn: (row) => row.tags.join(", "),
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Tags" />
				),
				cell: ({ row }) => <TagList tags={row.original.tags} />,
			},
			{
				id: "due",
				accessorKey: "due",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Due" />
				),
				cell: ({ row }) => <DueDate dueUnix={row.original.due} nowMs={nowMs} />,
			},
			{
				id: "reps",
				accessorKey: "reps",
				header: ({ column }) => (
					<DataTableColumnHeader column={column} label="Reps" />
				),
				cell: ({ row }) => (
					<span className="font-mono text-xs">{row.original.reps}</span>
				),
			},
			{
				id: "action",
				enableSorting: false,
				header: () => <span className="sr-only">Review</span>,
				cell: ({ row }) => (
					<Button
						variant="outline"
						size="sm"
						onClick={() => toggleReview(row.original.cardId)}
					>
						Review
					</Button>
				),
			},
		],
		[nowMs, toggleReview],
	);

	const table = useReactTable({
		data: filteredProblems,
		columns,
		state: { sorting, pagination },
		getRowId: (row) => row.problemId,
		enableRowSelection: false,
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
	});

	useRowNavHotkeys(
		table.getRowModel().rows.map((row) => ({
			onSelect: () => toggleReview(row.original.cardId),
		})),
	);

	return (
		<div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:px-6">
			<div className="flex items-center justify-between gap-3">
				<div className="relative w-full max-w-sm">
					<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 z-10 size-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						value={search}
						onChange={(event) => handleSearchChange(event.target.value)}
						placeholder="Filter by title, difficulty, tag..."
						className="*:data-[slot=input]:pl-8"
						aria-label="Filter tracked problems"
					/>
					<Kbd className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-2">
						{HOTKEY_LABELS.searchFocus[0]}
					</Kbd>
				</div>
				<p className="whitespace-nowrap font-mono text-muted-foreground text-xs">
					{filteredProblems.length} / {problems.length}
				</p>
			</div>
			{isLoading ? (
				<div className="flex justify-center py-10">
					<Spinner />
				</div>
			) : error ? (
				<p className="rounded-lg border border-destructive/30 bg-destructive/8 p-4 text-destructive-foreground text-sm">
					{error instanceof Error
						? error.message
						: "Could not load tracked problems."}
				</p>
			) : (
				<DataTable
					table={table}
					isRowExpanded={(row) => reviewCardId === row.original.cardId}
					renderExpandedRow={(row) => (
						<ReviewRowContent
							cardId={row.original.cardId}
							notes={row.original.notes}
							onClose={() => setReviewCardId(null)}
						/>
					)}
				/>
			)}
		</div>
	);
}
