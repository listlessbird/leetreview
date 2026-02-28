import { flexRender, type Table as TanstackTable } from "@tanstack/react-table";
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
import { getColumnPinningStyle } from "@/lib/data-table";
import { cn } from "@/lib/utils";

interface DataTableProps<TData> extends React.ComponentProps<"div"> {
	table: TanstackTable<TData>;
	actionBar?: React.ReactNode;
	showSelectionSummary?: boolean;
}

export function DataTable<TData>({
	table,
	actionBar,
	showSelectionSummary = true,
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
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
								>
									{row.getVisibleCells().map((cell) => (
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
									))}
								</TableRow>
							))
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
