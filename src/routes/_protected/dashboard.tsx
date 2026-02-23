import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { addProblemFromUrl, getDueCards } from "@/lib/review.server";

export const Route = createFileRoute("/_protected/dashboard")({
	loader: async () => getDueCards(),
	errorComponent: ({ error, reset }) => (
		<RouteErrorBoundary
			error={error}
			reset={reset}
			title="Couldn't load dashboard"
		/>
	),
	component: DashboardPage,
});

function DashboardPage() {
	const router = useRouter();
	const dueCards = Route.useLoaderData();
	const [showAddModal, setShowAddModal] = useState(false);
	const [url, setUrl] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError(null);
		setIsSubmitting(true);
		try {
			await addProblemFromUrl({ data: { url } });
			setUrl("");
			setShowAddModal(false);
			await router.invalidate();
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
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">
						Today's Due Reviews
					</h1>
					<div className="flex items-center gap-3 text-sm">
						<button
							type="button"
							className="underline decoration-white/30 underline-offset-4"
							onClick={() => setShowAddModal(true)}
						>
							Add problem
						</button>
						<Link
							className="underline decoration-white/30 underline-offset-4"
							to="/problems"
						>
							All problems
						</Link>
					</div>
				</header>

				{dueCards.length === 0 ? (
					<div className="rounded border border-white/10 bg-white/5 p-5 text-sm text-white/70">
						No cards are due right now.
					</div>
				) : (
					<ul className="space-y-3">
						{dueCards.map((card) => (
							<li
								key={card.cardId}
								className="rounded border border-white/10 bg-white/5 p-4"
							>
								<div className="mb-2 flex items-center justify-between gap-4">
									<div>
										<h2 className="text-lg font-semibold">{card.title}</h2>
										<p className="text-xs uppercase tracking-wide text-white/60">
											{card.difficulty}
										</p>
									</div>
									<Link
										to="/review/$cardId"
										params={{ cardId: card.cardId }}
										className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
									>
										Review
									</Link>
								</div>
								<div className="flex flex-wrap gap-2">
									{card.tags.map((tag) => (
										<span
											key={tag}
											className="rounded border border-white/15 px-2 py-1 text-xs text-white/70"
										>
											{tag}
										</span>
									))}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			{showAddModal ? (
				<div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4">
					<div className="w-full max-w-xl rounded border border-white/10 bg-[#11121a] p-5">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<h2 className="text-xl font-semibold">Add LeetCode Problem</h2>
								<p className="mt-1 text-sm text-white/65">
									Paste a URL like https://leetcode.com/problems/two-sum/
								</p>
							</div>
							<button
								type="button"
								className="rounded border border-white/20 px-2 py-1 text-xs hover:bg-white/10"
								onClick={() => setShowAddModal(false)}
							>
								Close
							</button>
						</div>

						<form className="space-y-3" onSubmit={onSubmit}>
							<input
								type="url"
								required
								value={url}
								onChange={(event) => setUrl(event.target.value)}
								placeholder="https://leetcode.com/problems/two-sum/"
								className="w-full rounded border border-white/20 bg-black/25 px-3 py-2 text-sm outline-none placeholder:text-white/35 focus:border-white/40"
							/>
							<div className="flex items-center gap-2">
								<button
									type="submit"
									disabled={isSubmitting}
									className="rounded border border-white/20 px-4 py-2 text-sm hover:bg-white/10 disabled:opacity-60"
								>
									{isSubmitting ? "Adding..." : "Add problem"}
								</button>
							</div>
							{error ? <p className="text-sm text-red-300">{error}</p> : null}
						</form>
					</div>
				</div>
			) : null}
		</div>
	);
}
