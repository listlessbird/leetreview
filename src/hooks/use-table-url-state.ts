import type { ColumnSort, PaginationState, SortingState, Updater } from "@tanstack/react-table";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { getSortingStateParser } from "@/lib/parsers";

interface UseTableUrlStateOptions {
	columnIds: string[];
	defaultSorting?: SortingState;
	defaultPageSize?: number;
}

type AnyData = Record<string, unknown>;

export function useTableUrlState(options: UseTableUrlStateOptions) {
	const {
		columnIds,
		defaultSorting = [],
		defaultPageSize = 10,
	} = options;

	const columnIdSet = React.useMemo(() => new Set(columnIds), [columnIds]);

	const [search, setSearchRaw] = useQueryState(
		"q",
		parseAsString.withOptions({ history: "replace", throttleMs: 50, clearOnDefault: true }).withDefault(""),
	);
	const deferredSearch = React.useDeferredValue(search.trim().toLowerCase());

	const [sorting, setSortingRaw] = useQueryState(
		"sort",
		getSortingStateParser<AnyData>(columnIdSet)
			.withOptions({ history: "replace", clearOnDefault: true })
			.withDefault(defaultSorting as ColumnSort[]),
	);

	const onSortingChange = React.useCallback(
		(updaterOrValue: Updater<SortingState>) => {
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(sorting as SortingState)
					: updaterOrValue;
			void setSortingRaw(next as ColumnSort[]);
		},
		[sorting, setSortingRaw],
	);

	const [page, setPage] = useQueryState(
		"page",
		parseAsInteger.withOptions({ history: "replace", clearOnDefault: true }).withDefault(1),
	);
	const [perPage, setPerPage] = useQueryState(
		"perPage",
		parseAsInteger.withOptions({ history: "replace", clearOnDefault: true }).withDefault(defaultPageSize),
	);

	const pagination: PaginationState = React.useMemo(
		() => ({ pageIndex: page - 1, pageSize: perPage }),
		[page, perPage],
	);

	const onPaginationChange = React.useCallback(
		(updaterOrValue: Updater<PaginationState>) => {
			const next =
				typeof updaterOrValue === "function"
					? updaterOrValue(pagination)
					: updaterOrValue;
			void setPage(next.pageIndex + 1);
			void setPerPage(next.pageSize);
		},
		[pagination, setPage, setPerPage],
	);

	const setSearch = React.useCallback(
		(value: string) => {
			void setSearchRaw(value);
			void setPage(1);
		},
		[setSearchRaw, setPage],
	);

	return {
		search,
		setSearch,
		deferredSearch,
		sorting: sorting as SortingState,
		onSortingChange,
		pagination,
		onPaginationChange,
	};
}
