import type { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	Select,
	SelectItem,
	SelectPopup,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const PAGE_SIZES = [10, 20, 50];

/** Page size picker and previous/next controls for a TanStack table. */
export function DataTablePagination<TData>({ table }: { table: Table<TData> }) {
	const { pageIndex, pageSize } = table.getState().pagination;

	return (
		<div className="flex items-center justify-end gap-4 text-muted-foreground text-sm">
			<div className="flex items-center gap-2">
				<span className="whitespace-nowrap">Rows</span>
				<Select
					value={pageSize}
					onValueChange={(value) => table.setPageSize(Number(value))}
					items={PAGE_SIZES.map((size) => ({ value: size, label: `${size}` }))}
				>
					<SelectTrigger size="sm" className="w-18 min-w-0">
						<SelectValue />
					</SelectTrigger>
					<SelectPopup>
						{PAGE_SIZES.map((size) => (
							<SelectItem key={size} value={size}>
								{size}
							</SelectItem>
						))}
					</SelectPopup>
				</Select>
			</div>
			<span className="whitespace-nowrap font-mono text-xs">
				{pageIndex + 1} / {Math.max(table.getPageCount(), 1)}
			</span>
			<div className="flex items-center gap-1">
				<Button
					aria-label="Previous page"
					variant="outline"
					size="icon-sm"
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronLeft />
				</Button>
				<Button
					aria-label="Next page"
					variant="outline"
					size="icon-sm"
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					<ChevronRight />
				</Button>
			</div>
		</div>
	);
}
