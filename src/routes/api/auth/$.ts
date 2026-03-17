import { createFileRoute } from "@tanstack/react-router";
import { Effect } from "effect";
import { runBackendEffect } from "@/backend/runtime";
import { RequestAuth, requestAuthLayer } from "@/lib/auth";

export const Route = createFileRoute("/api/auth/$")({
	server: {
		handlers: {
			GET: async ({ request }) =>
				(
					await runBackendEffect(
						Effect.flatMap(RequestAuth, (auth) =>
							auth.getAuthForRequest(request),
						).pipe(Effect.provide(requestAuthLayer)),
					)
				).handler(request),
			POST: async ({ request }) =>
				(
					await runBackendEffect(
						Effect.flatMap(RequestAuth, (auth) =>
							auth.getAuthForRequest(request),
						).pipe(Effect.provide(requestAuthLayer)),
					)
				).handler(request),
		},
	},
});
