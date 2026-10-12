"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addProblemFromUrl, reviewQueryKeys } from "@/lib/review.functions";

/** Add a problem by URL, for links shared straight to /add. */
export function AddPage() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const [url, setUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await addProblemFromUrl({ data: { url } });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.dueCards }),
				queryClient.invalidateQueries({ queryKey: reviewQueryKeys.problems }),
			]);
			router.replace("/dashboard");
		} catch (submissionError) {
			setError(
				submissionError instanceof Error
					? submissionError.message
					: "Could not add problem.",
			);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-10 sm:px-6">
			<div className="flex flex-col gap-1">
				<h2 className="font-semibold text-xl tracking-tight">
					Add a LeetCode problem
				</h2>
				<p className="text-muted-foreground text-sm">
					Paste a URL like https://leetcode.com/problems/two-sum/
				</p>
			</div>
			<form className="flex flex-col gap-3" onSubmit={onSubmit}>
				<Input
					type="url"
					required
					value={url}
					onChange={(event) => setUrl(event.target.value)}
					placeholder="https://leetcode.com/problems/two-sum/"
				/>
				<Button type="submit" disabled={isSubmitting} className="self-start">
					{isSubmitting ? "Adding..." : "Add problem"}
				</Button>
				{error ? (
					<p className="text-destructive-foreground text-sm">{error}</p>
				) : null}
			</form>
		</div>
	);
}
