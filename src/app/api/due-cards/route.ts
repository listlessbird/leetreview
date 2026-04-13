import { NextResponse } from "next/server";

import { getDueCards } from "@/server/review";

export async function GET(request: Request) {
	try {
		return NextResponse.json(await getDueCards(request.headers));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not load due cards.";
		const status = message === "Unauthorized" ? 401 : 500;

		return NextResponse.json({ error: message }, { status });
	}
}
