import { Agentation } from "agentation";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/pages/landing-page";
import { getSession } from "@/server/session";

export default async function Home({
	searchParams,
}: {
	searchParams: Promise<{ redirect?: string | string[] }>;
}) {
	const session = await getSession();
	if (session) {
		redirect("/dashboard");
	}

	const { redirect: redirectTo } = await searchParams;
	return (
		<>
			<LandingPage
				redirectTo={
					typeof redirectTo === "string" && redirectTo.startsWith("/")
						? redirectTo
						: "/dashboard"
				}
			/>
			{process.env.NODE_ENV === "development" && <Agentation />}
		</>
	);
}
