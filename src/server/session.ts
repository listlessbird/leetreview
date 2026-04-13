import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAuth } from "@/lib/auth";

export async function getSessionFromHeaders(requestHeaders: Headers) {
	const auth = await getAuth();
	return auth.api.getSession({ headers: requestHeaders });
}

export async function getSession() {
	return getSessionFromHeaders(await headers());
}

export async function requireSession() {
	const session = await getSession();
	if (!session?.user?.id) {
		redirect("/");
	}

	return session;
}
