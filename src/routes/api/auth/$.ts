import { createFileRoute } from "@tanstack/react-router";
import { getAuthForRequest } from "../../../lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				(await getAuthForRequest(request)).handler(request),
			POST: async ({ request }) =>
				(await getAuthForRequest(request)).handler(request),
		},
	},
});
