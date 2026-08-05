"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import * as React from "react";

import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
	reviewQueryKeys,
	type UpdateProblemMetaInput,
	updateProblem,
} from "@/lib/review.functions";
import { cn } from "@/lib/utils";

export type EditProblemButtonProps = {
	problemId: string;
	title: string;
	url: string;
	neetcodeUrl: string | null;
	tags: string[];
	className?: string;
	hoverReveal?: boolean;
};

export function EditProblemButton({
	problemId,
	title,
	url,
	neetcodeUrl,
	tags,
	className,
	hoverReveal = false,
}: EditProblemButtonProps) {
	const [open, setOpen] = React.useState(false);
	const [hasOpened, setHasOpened] = React.useState(false);

	return (
		<>
			<button
				type="button"
				onClick={(event) => {
					event.stopPropagation();
					setHasOpened(true);
					setOpen(true);
				}}
				aria-label={`Edit ${title}`}
				className={cn(
					"inline-flex size-6 shrink-0 items-center justify-center rounded border border-white/15 text-white/55 transition-colors duration-150 ease-out hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/30",
					hoverReveal &&
						"opacity-0 transition-opacity group-hover/row:opacity-100",
					className,
				)}
			>
				<Pencil className="size-3" />
			</button>
			{hasOpened ? (
				<EditProblemDialog
					open={open}
					onOpenChange={setOpen}
					problemId={problemId}
					title={title}
					url={url}
					neetcodeUrl={neetcodeUrl}
					tags={tags}
				/>
			) : null}
		</>
	);
}

type EditProblemDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	problemId: string;
	title: string;
	url: string;
	neetcodeUrl: string | null;
	tags: string[];
};

function EditProblemDialog({
	open,
	onOpenChange,
	problemId,
	title,
	url,
	neetcodeUrl,
	tags,
}: EditProblemDialogProps) {
	const queryClient = useQueryClient();
	const [urlValue, setUrlValue] = React.useState(url);
	const [neetcodeValue, setNeetcodeValue] = React.useState(neetcodeUrl ?? "");
	const [tagsValue, setTagsValue] = React.useState(tags.join(", "));

	React.useEffect(() => {
		if (open) {
			setUrlValue(url);
			setNeetcodeValue(neetcodeUrl ?? "");
			setTagsValue(tags.join(", "));
		}
	}, [open, url, neetcodeUrl, tags]);

	const mutation = useMutation({
		mutationFn: (data: UpdateProblemMetaInput) =>
			updateProblem({ problemId, data }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
				queryClient.invalidateQueries({
					queryKey: ["review-card"],
				}),
			]);
			onOpenChange(false);
		},
	});

	function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const trimmedNeetcode = neetcodeValue.trim();
		const parsedTags = tagsValue
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		mutation.mutate({
			url: urlValue.trim(),
			neetcodeUrl: trimmedNeetcode === "" ? null : trimmedNeetcode,
			tags: parsedTags,
		});
	}

	function handleOpenChange(next: boolean) {
		if (mutation.isPending) return;
		onOpenChange(next);
		if (!next) mutation.reset();
	}

	const errorMessage = mutation.isError
		? mutation.error instanceof Error
			? mutation.error.message
			: "Could not update problem."
		: null;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="border-white/10 bg-[#11121a] text-[#ededf5] sm:max-w-lg"
				onClick={(event) => event.stopPropagation()}
			>
				<DialogHeader className="flex-row items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<DialogTitle className="text-lg font-semibold text-[#ededf5]">
							Edit problem
						</DialogTitle>
						<DialogDescription className="text-sm text-white/55">
							{title}
						</DialogDescription>
					</div>
					<DialogClose asChild>
						<button
							type="button"
							disabled={mutation.isPending}
							className="shrink-0 rounded border border-white/20 px-2 py-1 text-xs text-white/60 transition-colors duration-150 ease hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
						>
							Close
						</button>
					</DialogClose>
				</DialogHeader>

				<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
					<Field label="LeetCode URL" htmlFor={`${problemId}-url`}>
						<Input
							id={`${problemId}-url`}
							type="url"
							required
							value={urlValue}
							onChange={(e) => setUrlValue(e.target.value)}
							placeholder="https://leetcode.com/problems/..."
							className="border-white/15 bg-white/3 text-[#ededf5] placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-0"
						/>
					</Field>
					<Field
						label="NeetCode URL"
						htmlFor={`${problemId}-neetcode`}
						hint="Optional"
					>
						<Input
							id={`${problemId}-neetcode`}
							type="url"
							value={neetcodeValue}
							onChange={(e) => setNeetcodeValue(e.target.value)}
							placeholder="https://neetcode.io/problems/..."
							className="border-white/15 bg-white/3 text-[#ededf5] placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-0"
						/>
					</Field>
					<Field
						label="Tags"
						htmlFor={`${problemId}-tags`}
						hint="Comma-separated"
					>
						<Input
							id={`${problemId}-tags`}
							type="text"
							value={tagsValue}
							onChange={(e) => setTagsValue(e.target.value)}
							placeholder="array, hash-table, two-pointers"
							className="border-white/15 bg-white/3 text-[#ededf5] placeholder:text-white/30 focus-visible:border-white/30 focus-visible:ring-0"
						/>
					</Field>

					{errorMessage ? (
						<p className="rounded border border-red-500/20 bg-red-500/6 px-3 py-2 text-sm text-red-300">
							{errorMessage}
						</p>
					) : null}

					<DialogFooter className="gap-2">
						<DialogClose asChild>
							<button
								type="button"
								disabled={mutation.isPending}
								className="rounded border border-white/15 px-3 py-1.5 text-sm text-white/70 transition-colors duration-150 ease-out hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
							>
								Cancel
							</button>
						</DialogClose>
						<button
							type="submit"
							disabled={mutation.isPending}
							className="inline-flex items-center gap-2 rounded border border-emerald-500/30 bg-emerald-500/[0.07] px-3 py-1.5 text-sm text-[#ededf5] transition-colors duration-150 ease-out hover:border-emerald-400/50 hover:bg-emerald-500/15 active:scale-[0.975] disabled:cursor-not-allowed disabled:opacity-50"
						>
							{mutation.isPending ? <Spinner className="size-3.5" /> : null}
							Save changes
						</button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

function Field({
	label,
	htmlFor,
	hint,
	children,
}: {
	label: string;
	htmlFor: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="flex flex-col gap-1.5">
			<div className="flex items-center justify-between gap-2">
				<label
					htmlFor={htmlFor}
					className="text-xs font-medium uppercase tracking-wide text-white/55"
				>
					{label}
				</label>
				{hint ? (
					<span className="text-[10px] text-white/35">{hint}</span>
				) : null}
			</div>
			{children}
		</div>
	);
}
