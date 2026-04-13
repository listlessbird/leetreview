import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { getReviewCard, submitReview } from "@/server/review";

const reviewInput = z.object({
	rating: z.number().int().min(1).max(4),
});

export async function GET(
	request: Request,
	context: { params: Promise<{ cardId: string }> },
) {
	try {
		const { cardId } = await context.params;
		return NextResponse.json(await getReviewCard(request.headers, cardId));
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Could not load review card.";
		const status = message === "Unauthorized" ? 401 : 500;

		return NextResponse.json({ error: message }, { status });
	}
}

export async function POST(
	request: Request,
	context: { params: Promise<{ cardId: string }> },
) {
	try {
		const { cardId } = await context.params;
		const { rating } = reviewInput.parse(await request.json());
		const result = await submitReview(request.headers, { cardId, rating });
		return NextResponse.json(result);
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to submit review.";
		const status =
			error instanceof ZodError ? 400 : message === "Unauthorized" ? 401 : 500;

		return NextResponse.json({ error: message }, { status });
	}
}
