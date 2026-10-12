import { AddPage } from "@/components/pages/add-page";
import { requireSession } from "@/server/session";

export default async function AddRoute() {
	await requireSession();
	return <AddPage />;
}
