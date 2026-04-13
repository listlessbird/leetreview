import { ProblemsPage } from "@/components/pages/problems-page";
import { requireSession } from "@/server/session";

export default async function ProblemsRoute() {
	await requireSession();
	return <ProblemsPage />;
}
