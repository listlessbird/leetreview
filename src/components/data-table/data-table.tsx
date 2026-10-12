import {
	flexRender,
	type Row,
	type Table as TanstackTable,
} from "@tanstack/react-table";
import type * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A TanStack table in a bordered card with pagination below. A row for which
 * `isRowExpanded` is true renders `renderExpandedRow` across all columns
 * instead of its cells.
 */
export function DataTable<TData>({
	table,
	isRowExpanded,
	renderExpandedRow,
	className,
}: {
	table: TanstackTable<TData>;
	isRowExpanded?: (row: Row<TData>) => boolean;
	renderExpandedRow?: (row: Row<TData>) => React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("flex w-full flex-col gap-3", className)}>
			<div className="overflow-hidden rounded-xl border bg-card">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="hover:bg-transparent">
								{headerGroup.headers.map((header) => (
									<TableHead key={header.id} colSpan={header.colSpan}>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} className="group/row">
									{isRowExpanded?.(row) && renderExpandedRow ? (
										<TableCell
											colSpan={row.getVisibleCells().length}
											className="p-0"
										>
											{renderExpandedRow(row)}
										</TableCell>
									) : (
										row
											.getVisibleCells()
											.map((cell) => (
												<TableCell key={cell.id}>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))
									)}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={table.getAllColumns().length}
									className="h-24 text-center text-muted-foreground"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<DataTablePagination table={table} />
		</div>
	);
}
