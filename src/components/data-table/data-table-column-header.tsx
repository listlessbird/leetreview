"use client";

import type { Column } from "@tanstack/react-table";
import {
	ChevronDown,
	ChevronsUpDown,
	ChevronUp,
	EyeOff,
	X,
} from "lucide-react";

import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.ComponentProps<typeof DropdownMenuTrigger> {
	column: Column<TData, TValue>;
	label: string;
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	label,
	className,
	...props
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort() && !column.getCanHide()) {
		return <div className={cn(className)}>{label}</div>;
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				className={cn(
					"-ml-1.5 flex h-8 items-center gap-1.5 rounded-md px-2 py-1.5 text-white/80 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus:ring-1 focus:ring-white/25 data-[state=open]:bg-white/10 data-[state=open]:text-white motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-white/60",
					className,
				)}
				{...props}
			>
				{label}
				{column.getCanSort() &&
					(column.getIsSorted() === "desc" ? (
						<ChevronDown />
					) : column.getIsSorted() === "asc" ? (
						<ChevronUp />
					) : (
						<ChevronsUpDown />
					))}
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="start"
				className="w-28 border-white/15 bg-[#0d0d16] text-[#ededf5]"
			>
				{column.getCanSort() && (
					<>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 text-[#ededf5] focus:bg-white/10 focus:text-white [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-white/70"
							checked={column.getIsSorted() === "asc"}
							onClick={() => column.toggleSorting(false)}
						>
							<ChevronUp />
							Asc
						</DropdownMenuCheckboxItem>
						<DropdownMenuCheckboxItem
							className="relative pr-8 pl-2 text-[#ededf5] focus:bg-white/10 focus:text-white [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-white/70"
							checked={column.getIsSorted() === "desc"}
							onClick={() => column.toggleSorting(true)}
						>
							<ChevronDown />
							Desc
						</DropdownMenuCheckboxItem>
						{column.getIsSorted() && (
							<DropdownMenuItem
								className="pl-2 text-[#ededf5] focus:bg-white/10 focus:text-white [&_svg]:text-white/70"
								onClick={() => column.clearSorting()}
							>
								<X />
								Reset
							</DropdownMenuItem>
						)}
					</>
				)}
				{column.getCanHide() && (
					<DropdownMenuCheckboxItem
						className="relative pr-8 pl-2 text-[#ededf5] focus:bg-white/10 focus:text-white [&>span:first-child]:right-2 [&>span:first-child]:left-auto [&_svg]:text-white/70"
						checked={!column.getIsVisible()}
						onClick={() => column.toggleVisibility(false)}
					>
						<EyeOff />
						Hide
					</DropdownMenuCheckboxItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
