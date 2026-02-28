import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { getAuthForRequest } from "@/lib/auth";

export const getSession = createServerFn({ method: "GET" }).handler(
	async () => {
		const request = getRequest();
		const auth = await getAuthForRequest(request);
		return auth.api.getSession({ headers: request.headers });
	},
);
