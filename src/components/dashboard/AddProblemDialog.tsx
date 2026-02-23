import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { searchLeetCodeProblems } from "@/lib/leetcode.rpc";
import { addProblemFromUrl } from "@/lib/review.server";

/* ─── types ───────────────────────────────────── */

type SearchResult = {
	title: string;
	slug: string;
	difficulty: string | null;
	url: string;
};

/* ─── sub-component ───────────────────────────── */

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
		<li className="rounded border border-white/10 bg-white/3 p-3 transition-colors duration-150 ease-out hover:bg-white/[0.07]">
			<div className="flex items-center justify-between gap-4">
				<div className="min-w-0">
					<p className="text-sm font-semibold leading-snug">{result.title}</p>
					<div className="mt-0.5 flex items-center gap-2 text-xs text-white/40">
						{result.difficulty ? (
							<span className="uppercase tracking-wide">
								{result.difficulty}
							</span>
						) : null}
						<span className="truncate">{result.slug}</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => onAdd(result.slug)}
					disabled={isPending}
					className="shrink-0 rounded border border-white/20 px-3 py-1.5 text-xs text-[#ededf5] transition-colors duration-150 ease hover:bg-white/10 active:scale-[0.97] disabled:opacity-50"
				>
					{isThis ? <Spinner className="size-3" /> : "Add"}
				</button>
			</div>
		</li>
	);
}

/* ─── main component ──────────────────────────── */

interface AddProblemDialogProps {
	onAdded: () => void | Promise<void>;
}

export function AddProblemDialog({ onAdded }: AddProblemDialogProps) {
	const [open, setOpen] = useState(false);
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
			await onAdded();
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
			{/* ── trigger ── */}
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="group relative overflow-hidden rounded border border-indigo-500/30 bg-indigo-500/[0.07] px-3 py-1.5 text-sm text-[#ededf5] transition-all duration-150 ease hover:border-indigo-400/50 hover:bg-indigo-500/15 hover:shadow-[0_0_14px_rgba(99,102,241,0.22)] active:scale-[0.975] active:transition-none"
			>
				<span className="relative z-10">+ Add problem</span>
				<span className="pointer-events-none absolute inset-0 bg-linear-to-br from-indigo-500/10 to-transparent opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
			</button>

			<DialogContent
				showCloseButton={false}
				className="border-white/10 bg-[#11121a] text-[#ededf5] sm:max-w-xl"
			>
				{/* ── header ── */}
				<DialogHeader className="flex-row items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<DialogTitle className="text-lg font-semibold text-[#ededf5]">
							Search LeetCode Problems
						</DialogTitle>
						<DialogDescription className="text-sm text-white/50">
							Type a title or paste a LeetCode link.
						</DialogDescription>
					</div>
					<DialogClose asChild>
						<button
							type="button"
							className="shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-white/60 transition-colors duration-150 ease hover:bg-white/10 hover:text-white"
						>
							Close
						</button>
					</DialogClose>
				</DialogHeader>

				{/* ── search input ── */}
				<Input
					type="text"
					autoFocus
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					placeholder="e.g. two sum, group anagrams..."
					className="border-white/15 bg-white/3 text-[#ededf5] placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-0"
				/>

				{/* ── scrollable results (shadcn pattern: -mx + max-h + overflow-y-auto + px) ── */}
				<div className="no-scrollbar -mx-6 max-h-[50vh] overflow-y-auto px-6">
					{isSearching ? (
						<div className="flex items-center gap-2 py-3 text-sm text-white/50">
							<Spinner className="size-3.5" />
							<span>Searching...</span>
						</div>
					) : null}

					{searchQuery.trim().length >= 2 &&
					!isSearching &&
					results.length === 0 &&
					!searchError ? (
						<p className="py-3 text-center text-sm text-white/35">
							No problems found for &ldquo;{searchQuery.trim()}&rdquo;
						</p>
					) : null}

					{results.length > 0 ? (
						<ul className="space-y-2">
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

					{displayError ? (
						<p className="mt-2 rounded border border-red-500/20 bg-red-500/6 px-3 py-2 text-sm text-red-300">
							{displayError}
						</p>
					) : null}
				</div>
			</DialogContent>
		</Dialog>
	);
}
