import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { getSession } from "@/lib/auth.server";

export const Route = createFileRoute("/_protected")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
	beforeLoad: async ({ location }) => {
		const session = await getSession();
		if (!session) {
			throw redirect({
				to: "/",
				search: { redirect: location.href },
			});
		}
		return { user: session.user };
	},
	component: () => <Outlet />,
});
