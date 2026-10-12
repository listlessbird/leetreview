"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Difficulty } from "@/components/review/problem-meta";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogDescription,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { searchLeetCodeProblems } from "@/lib/leetcode.functions";
import { addProblemFromUrl, reviewQueryKeys } from "@/lib/review.functions";

type SearchResult = {
	title: string;
	slug: string;
	frontendId: string | null;
	difficulty: string | null;
	paidOnly: boolean;
	url: string;
};

function ResultItem({
	result,
	isPending,
	pendingSlug,
	onAdd,
}: {
	result: SearchResult;
	isPending: boolean;
	pendingSlug: string | undefined;
	onAdd: (slug: string) => void;
}) {
	const isThis = isPending && pendingSlug === result.slug;

	return (
		<li className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 transition-colors hover:bg-accent">
			<div className="min-w-0">
				<p className="truncate font-medium text-sm">
					{result.frontendId ? (
						<span className="font-mono text-muted-foreground">
							{result.frontendId}.{" "}
						</span>
					) : null}
					{result.title}
				</p>
				<div className="mt-0.5 flex items-center gap-2 text-xs">
					{result.difficulty ? (
						<Difficulty difficulty={result.difficulty} />
					) : null}
					{result.paidOnly ? (
						<span className="font-mono text-2xs text-warning-foreground uppercase">
							Premium
						</span>
					) : null}
					<span className="truncate font-mono text-muted-foreground">
						{result.slug}
					</span>
				</div>
			</div>
			<Button
				size="sm"
				variant="outline"
				onClick={() => onAdd(result.slug)}
				disabled={isPending}
			>
				{isThis ? <Spinner /> : "Add"}
			</Button>
		</li>
	);
}

/** Search LeetCode and track a problem. Controlled by the app shell (hotkey C). */
export function AddProblemDialog({
	open,
	onOpenChange: setOpen,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const queryClient = useQueryClient();
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [results, setResults] = useState<SearchResult[]>([]);

	const addMutation = useMutation({
		mutationFn: (slug: string) =>
			addProblemFromUrl({
				data: { url: `https://leetcode.com/problems/${slug}/` },
			}),
		onSuccess: async () => {
			setSearchQuery("");
			setResults([]);
			setOpen(false);
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
			]);
		},
	});

	/* debounced search */
	useEffect(() => {
		if (!open) return;

		const query = searchQuery.trim();
		if (query.length < 2) {
			setResults([]);
			setSearchError(null);
			return;
		}

		let cancelled = false;
		const timer = setTimeout(async () => {
			setIsSearching(true);
			setSearchError(null);
			try {
				const found = await searchLeetCodeProblems({ data: { query } });
				if (!cancelled) setResults(found);
			} catch (err) {
				if (!cancelled) {
					setResults([]);
					setSearchError(
						err instanceof Error ? err.message : "Could not search problems.",
					);
				}
			} finally {
				if (!cancelled) setIsSearching(false);
			}
		}, 300);

		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [searchQuery, open]);

	function handleOpenChange(next: boolean) {
		setOpen(next);
		if (!next) {
			setSearchQuery("");
			setResults([]);
			setSearchError(null);
			addMutation.reset();
		}
	}

	const displayError =
		searchError ??
		(addMutation.isError
			? addMutation.error instanceof Error
				? addMutation.error.message
				: "Could not add problem."
			: null);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogPopup className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Add problem</DialogTitle>
					<DialogDescription>
						Search LeetCode by title or paste a problem link.
					</DialogDescription>
				</DialogHeader>
				<DialogPanel className="flex flex-col gap-3">
					<Input
						type="text"
						autoFocus
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="e.g. two sum, group anagrams..."
					/>
					<div className="-mx-3 max-h-[50vh] overflow-y-auto [scrollbar-color:var(--color-border)_transparent] [scrollbar-width:thin]">
						{isSearching ? (
							<div className="flex items-center gap-2 px-3 py-3 text-muted-foreground text-sm">
								<Spinner />
								Searching...
							</div>
						) : null}

						{searchQuery.trim().length >= 2 &&
						!isSearching &&
						results.length === 0 &&
						!searchError ? (
							<p className="py-3 text-center text-muted-foreground text-sm">
								No problems found for &ldquo;{searchQuery.trim()}&rdquo;
							</p>
						) : null}

						{results.length > 0 ? (
							<ul className="flex flex-col">
								{results.map((result) => (
									<ResultItem
										key={result.slug}
										result={result}
										isPending={addMutation.isPending}
										pendingSlug={addMutation.variables}
										onAdd={(slug) => addMutation.mutate(slug)}
									/>
								))}
							</ul>
						) : null}
					</div>
					{displayError ? (
						<p className="text-destructive-foreground text-sm">
							{displayError}
						</p>
					) : null}
				</DialogPanel>
			</DialogPopup>
		</Dialog>
	);
}
