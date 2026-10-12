import { ReviewCardPage } from "@/components/pages/review-card-page";
import { requireSession } from "@/server/session";

export default async function ReviewCardRoute({
	params,
}: {
	params: Promise<{ cardId: string }>;
}) {
	await requireSession();
	const { cardId } = await params;
	return <ReviewCardPage cardId={cardId} />;
}
