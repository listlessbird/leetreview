import type { PaginationState, SortingState, Updater } from "@tanstack/react-table";
import * as React from "react";
import type { TableSearch } from "@/lib/table-search-params";

interface UseTableUrlStateOptions {
	search: TableSearch;
	onSearchChange: (updater: (prev: TableSearch) => TableSearch) => void;
	defaultSorting?: SortingState;
	defaultPageSize?: number;
}

export function useTableUrlState({
	search,
	onSearchChange,
	defaultSorting = [],
	defaultPageSize = 10,
}: UseTableUrlStateOptions) {
	const deferredSearch = React.useDeferredValue(search.q.trim().toLowerCase());

	const sorting: SortingState =
		search.sort.length > 0 ? (search.sort as SortingState) : defaultSorting;

	const setSearch = React.useCallback(
		(value: string) => {
			onSearchChange((prev) => ({ ...prev, q: value, page: 1 }));
		},
		[onSearchChange],
	);

	const onSortingChange = React.useCallback(
		(updaterOrValue: Updater<SortingState>) => {
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(sorting)
					: updaterOrValue;
			onSearchChange((prev) => ({ ...prev, sort: next, page: 1 }));
		},
		[sorting, onSearchChange],
	);

	const pagination: PaginationState = React.useMemo(
		() => ({
			pageIndex: search.page - 1,
			pageSize: search.perPage > 0 ? search.perPage : defaultPageSize,
		}),
		[search.page, search.perPage, defaultPageSize],
	);

	const onPaginationChange = React.useCallback(
		(updaterOrValue: Updater<PaginationState>) => {
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(pagination)
					: updaterOrValue;
			onSearchChange((prev) => ({
				...prev,
				page: next.pageIndex + 1,
				perPage: next.pageSize,
			}));
		},
		[pagination, onSearchChange],
	);

	return {
		search: search.q,
		setSearch,
		deferredSearch,
		sorting,
		onSortingChange,
		pagination,
		onPaginationChange,
	};
}
