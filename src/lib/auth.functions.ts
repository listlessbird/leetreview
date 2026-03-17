import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { Effect } from "effect";
import { runBackendEffect } from "@/backend/runtime";
import { RequestAuth, requestAuthLayer } from "@/lib/auth";

export const getSession = createServerFn({ method: "GET" }).handler(() => {
	const request = getRequest();
	return runBackendEffect(
		Effect.flatMap(RequestAuth, (auth) => auth.getSession(request)).pipe(
			Effect.provide(requestAuthLayer),
		),
	);
});
