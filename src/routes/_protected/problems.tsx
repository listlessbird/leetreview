import { Link, createFileRoute } from "@tanstack/react-router";
import { listProblems } from "@/lib/review.server";

export const Route = createFileRoute("/_protected/problems")({
	loader: async () => listProblems(),
	component: ProblemsPage,
});

function ProblemsPage() {
	const problems = Route.useLoaderData();

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
				<div className="flex items-center justify-between gap-3">
					<h1 className="text-2xl font-bold tracking-tight">Tracked Problems</h1>
					<Link className="text-sm underline decoration-white/30 underline-offset-4" to="/dashboard">
						Back to dashboard
					</Link>
				</div>
				<div className="overflow-x-auto rounded border border-white/10 bg-white/5">
					<table className="w-full min-w-[780px] text-left text-sm">
						<thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/60">
							<tr>
								<th className="p-3">Title</th>
								<th className="p-3">Difficulty</th>
								<th className="p-3">Tags</th>
								<th className="p-3">Due</th>
								<th className="p-3">Reps</th>
								<th className="p-3">Action</th>
							</tr>
						</thead>
						<tbody>
							{problems.map((problem) => (
								<tr key={problem.problemId} className="border-b border-white/10 last:border-0">
									<td className="p-3">{problem.title}</td>
									<td className="p-3">{problem.difficulty}</td>
									<td className="p-3 text-white/70">{problem.tags.join(", ")}</td>
									<td className="p-3">{new Date(problem.due * 1000).toLocaleString()}</td>
									<td className="p-3">{problem.reps}</td>
									<td className="p-3">
										<Link
											to="/review/$cardId"
											params={{ cardId: problem.cardId }}
											className="rounded border border-white/20 px-2.5 py-1.5 hover:bg-white/10"
										>
											Review
										</Link>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
