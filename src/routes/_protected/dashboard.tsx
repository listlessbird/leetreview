import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { AddProblemDialog } from "@/components/dashboard/AddProblemDialog";
import { DueCard } from "@/components/dashboard/DueCard";
import { RouteErrorBoundary } from "@/components/route-error-boundary";
import { getDueCards } from "@/lib/review.server";

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

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
				<header className="flex flex-wrap items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">
						Today's Due Reviews
					</h1>
					<div className="flex items-center gap-3 text-sm">
						<AddProblemDialog onAdded={() => router.invalidate()} />
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
						No problems are due right now.
					</div>
				) : (
					<ul className="space-y-3">
						{dueCards.map((card) => (
							<DueCard key={card.cardId} card={card} />
						))}
					</ul>
				)}
			</div>
		</div>
	);
}
