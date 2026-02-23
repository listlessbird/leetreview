import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_protected/")({
	head: () => ({ meta: [{ title: "Dashboard — leet-review" }] }),
	component: App,
});

function App() {
	const { user } = Route.useRouteContext();

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<h1 className="mb-6 text-2xl font-bold tracking-tight">Session</h1>
			<pre className="rounded border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-[rgba(237,237,245,0.8)]">
				{JSON.stringify(user, null, 2)}
			</pre>
		</div>
	);
}
