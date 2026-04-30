import { headers } from "next/headers";
import { DashboardPage } from "@/components/pages/dashboard-page";
import { getDueCards } from "@/server/review";
import { requireSession } from "@/server/session";

export default async function DashboardRoute() {
	await requireSession();
	const initialDailyReviewPlan = await getDueCards(
		new Headers(await headers()),
	);

	return <DashboardPage initialDailyReviewPlan={initialDailyReviewPlan} />;
}
