import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { updateProblemMeta } from "@/server/review";

const updateInput = z.object({
	url: z.string().url(),
	neetcodeUrl: z.string().url().nullable(),
	tags: z.array(z.string().min(1)).max(50),
});

export async function PATCH(
	request: Request,
	{ params }: { params: Promise<{ problemId: string }> },
) {
	try {
		const { problemId } = await params;
		const body = updateInput.parse(await request.json());
		const result = await updateProblemMeta(request.headers, problemId, body);
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not update problem.";
		const status =
			error instanceof ZodError
				? 400
				: message === "Unauthorized"
					? 401
					: message === "Problem not found."
						? 404
						: 500;

		return NextResponse.json({ error: message }, { status });
	}
}
