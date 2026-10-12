"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
	notes: string | null;
	tags: string[];
	className?: string;
	hoverReveal?: boolean;
};

export function EditProblemButton({
	problemId,
	title,
	url,
	neetcodeUrl,
	notes,
	tags,
	className,
	hoverReveal = false,
}: EditProblemButtonProps) {
	const [open, setOpen] = React.useState(false);
	const [hasOpened, setHasOpened] = React.useState(false);

	return (
		<>
			<Button
				size="icon-xs"
				variant="ghost"
				onClick={(event) => {
					event.stopPropagation();
					setHasOpened(true);
					setOpen(true);
				}}
				aria-label={`Edit ${title}`}
				className={cn(
					hoverReveal &&
						"opacity-0 transition-opacity focus-visible:opacity-100 group-hover/row:opacity-100",
					className,
				)}
			>
				<Pencil />
			</Button>
			{hasOpened ? (
				<EditProblemDialog
					open={open}
					onOpenChange={setOpen}
					problemId={problemId}
					title={title}
					url={url}
					neetcodeUrl={neetcodeUrl}
					notes={notes}
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
	notes: string | null;
	tags: string[];
};

function EditProblemDialog({
	open,
	onOpenChange,
	problemId,
	title,
	url,
	neetcodeUrl,
	notes,
	tags,
}: EditProblemDialogProps) {
	const queryClient = useQueryClient();
	const [urlValue, setUrlValue] = React.useState(url);
	const [neetcodeValue, setNeetcodeValue] = React.useState(neetcodeUrl ?? "");
	const [tagsValue, setTagsValue] = React.useState(tags.join(", "));
	const [notesValue, setNotesValue] = React.useState(notes ?? "");

	React.useEffect(() => {
		if (open) {
			setUrlValue(url);
			setNeetcodeValue(neetcodeUrl ?? "");
			setTagsValue(tags.join(", "));
			setNotesValue(notes ?? "");
		}
	}, [open, url, neetcodeUrl, notes, tags]);

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
		const trimmedNotes = notesValue.trim();
		const parsedTags = tagsValue
			.split(",")
			.map((t) => t.trim())
			.filter(Boolean);

		mutation.mutate({
			url: urlValue.trim(),
			neetcodeUrl: trimmedNeetcode === "" ? null : trimmedNeetcode,
			notes: trimmedNotes === "" ? null : trimmedNotes,
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
			<DialogPopup
				className="sm:max-w-lg"
				onClick={(event) => event.stopPropagation()}
			>
				<form className="contents" onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>Edit problem</DialogTitle>
						<DialogDescription>{title}</DialogDescription>
					</DialogHeader>
					<DialogPanel className="flex flex-col gap-4">
						<Field label="LeetCode URL" htmlFor={`${problemId}-url`}>
							<Input
								id={`${problemId}-url`}
								type="url"
								required
								value={urlValue}
								onChange={(e) => setUrlValue(e.target.value)}
								placeholder="https://leetcode.com/problems/..."
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
							/>
						</Field>
						<Field
							label="Note"
							htmlFor={`${problemId}-notes`}
							hint="Pattern, key insight, gotcha"
						>
							<Textarea
								id={`${problemId}-notes`}
								value={notesValue}
								onChange={(e) => setNotesValue(e.target.value)}
								maxLength={2000}
								rows={3}
								className="font-mono"
								placeholder={
									"Sliding window over counts.\nShrink while window is invalid.\nAnswer is max window length."
								}
							/>
						</Field>
						{errorMessage ? (
							<p className="text-destructive-foreground text-sm">
								{errorMessage}
							</p>
						) : null}
					</DialogPanel>
					<DialogFooter>
						<DialogClose
							disabled={mutation.isPending}
							render={<Button variant="ghost" />}
						>
							Cancel
						</DialogClose>
						<Button type="submit" disabled={mutation.isPending}>
							{mutation.isPending ? <Spinner /> : null}
							Save changes
						</Button>
					</DialogFooter>
				</form>
			</DialogPopup>
		</Dialog>
	);
}

/** A labelled form row with an optional right-aligned hint. */
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
				<Label htmlFor={htmlFor}>{label}</Label>
				{hint ? (
					<span className="text-muted-foreground text-xs">{hint}</span>
				) : null}
			</div>
			{children}
		</div>
	);
}
