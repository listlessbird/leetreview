"use client";

import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { Button } from "@/components/ui/button";

/** A column label that cycles ascending → descending → unsorted on click. */
export function DataTableColumnHeader<TData, TValue>({
	column,
	label,
}: {
	column: Column<TData, TValue>;
	label: string;
}) {
	if (!column.getCanSort()) return label;

	const sorted = column.getIsSorted();
	return (
		<Button
			variant="ghost"
			size="xs"
			className="-ml-2 text-muted-foreground hover:text-foreground"
			onClick={column.getToggleSortingHandler()}
		>
			{label}
			{sorted === "desc" ? (
				<ChevronDown />
			) : sorted === "asc" ? (
				<ChevronUp />
			) : (
				<ChevronsUpDown className="opacity-50" />
			)}
		</Button>
	);
}
