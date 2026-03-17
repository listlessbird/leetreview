import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { RouteErrorBoundary } from "./components/route-error-boundary";
import { getContext } from "./integrations/tanstack-query/root-provider";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
	const router = createTanStackRouter({
		routeTree,

		context: getContext(),

		defaultErrorComponent: ({ error, reset }) => (
			<RouteErrorBoundary
				error={error}
				reset={reset}
				title="Application error"
			/>
		),

		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});

	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
