import { flexRender, type Row, type Table as TanstackTable } from "@tanstack/react-table";
import * as React from "react";

import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	showSelectionSummary?: boolean;
	/** When true for a row, that row's cells are replaced with renderExpandedRow output. */
	isRowExpanded?: (row: Row<TData>) => boolean;
	renderExpandedRow?: (row: Row<TData>, colSpan: number) => React.ReactNode;
}

export function DataTable<TData>({
	table,
	actionBar,
	showSelectionSummary = true,
	isRowExpanded,
	renderExpandedRow,
	children,
	className,
	...props
}: DataTableProps<TData>) {
	return (
		<div
			className={cn(
				"data-table-root flex w-full flex-col gap-2.5 overflow-auto",
				className,
			)}
			{...props}
		>
			{children}
			<div className="data-table-shell animate-in fade-in-0 overflow-hidden rounded-md border duration-200 ease-out motion-reduce:animate-none">
				<Table className="[&_tbody_tr[data-slot=table-row]:hover]:!bg-transparent [&_thead_tr[data-slot=table-row]:hover]:!bg-transparent">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										colSpan={header.colSpan}
										style={{
											...getColumnPinningStyle({ column: header.column }),
										}}
									>
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
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => {
								const expanded = isRowExpanded?.(row) ?? false;
								const colSpan = row.getVisibleCells().length;
								return (
									<TableRow
										key={row.id}
										data-state={row.getIsSelected() && "selected"}
									>
										{expanded && renderExpandedRow ? (
											<TableCell colSpan={colSpan} className="animate-in fade-in-0 p-0 duration-150">
												{renderExpandedRow(row, colSpan)}
											</TableCell>
										) : (
											row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													style={{
														...getColumnPinningStyle({ column: cell.column }),
													}}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))
										)}
									</TableRow>
								);
							})
						) : (
							<TableRow>
								<TableCell
									colSpan={table.getAllColumns().length}
									className="h-24 text-center"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="data-table-footer flex flex-col gap-2.5">
				<DataTablePagination
					table={table}
					showSelectionSummary={showSelectionSummary}
				/>
				{actionBar &&
					table.getFilteredSelectedRowModel().rows.length > 0 &&
					actionBar}
			</div>
		</div>
	);
}
