import { DashboardPage } from "@/components/pages/dashboard-page";
import { requireSession } from "@/server/session";

export default async function DashboardRoute() {
	await requireSession();
	return <DashboardPage />;
}
