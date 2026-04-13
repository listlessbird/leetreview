import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { addProblemFromUrl, listProblems } from "@/server/review";

const addProblemInput = z.object({
	url: z.string().url(),
});

export async function GET(request: Request) {
	try {
		return NextResponse.json(await listProblems(request.headers));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not load problems.";
		const status = message === "Unauthorized" ? 401 : 500;

		return NextResponse.json({ error: message }, { status });
	}
}

export async function POST(request: Request) {
	try {
		const { url } = addProblemInput.parse(await request.json());
		const result = await addProblemFromUrl(request.headers, url);
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not add problem.";
		const status =
			error instanceof ZodError ? 400 : message === "Unauthorized" ? 401 : 500;

		return NextResponse.json({ error: message }, { status });
	}
}
