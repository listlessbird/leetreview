import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { addProblemFromUrl } from "@/lib/review.server";

export const Route = createFileRoute("/_protected/add")({
	component: AddProblemPage,
});

function AddProblemPage() {
	const navigate = useNavigate();
	const [url, setUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await addProblemFromUrl({ data: { url } });
			await navigate({ to: "/dashboard" });
		} catch (submissionError) {
			setError(submissionError instanceof Error ? submissionError.message : "Could not add problem.");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-2xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="mb-2 text-2xl font-bold tracking-tight">Add LeetCode Problem</h1>
				<p className="mb-6 text-sm text-white/65">Paste a URL like https://leetcode.com/problems/two-sum/</p>
				<form className="space-y-4" onSubmit={onSubmit}>
					<input
						type="url"
						required
						value={url}
						onChange={(event) => setUrl(event.target.value)}
						placeholder="https://leetcode.com/problems/two-sum/"
						className="w-full rounded border border-white/20 bg-black/25 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-white/40"
					/>
					<button
						type="submit"
						disabled={isSubmitting}
						className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
					>
						{isSubmitting ? "Adding..." : "Add problem"}
					</button>
					{error ? <p className="text-sm text-red-300">{error}</p> : null}
				</form>
			</div>
		</div>
	);
}
