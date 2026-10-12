import { headers } from "next/headers";
import { AppShell } from "@/components/shell/AppShell";
import { getDueCards } from "@/server/review";
import { requireSession } from "@/server/session";

export default async function AppLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireSession();
	const initialPlan = await getDueCards(new Headers(await headers()));

	return <AppShell initialPlan={initialPlan}>{children}</AppShell>;
}
