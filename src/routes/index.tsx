import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "@/lib/auth.server";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const session = await getSession();
		if (session) {
			throw redirect({ to: "/dashboard" });
		}
	},
	component: LandingPage,
});

function LandingPage() {
	const [isLoading, setIsLoading] = useState(false);

	async function handleSignIn() {
		setIsLoading(true);
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/dashboard",
		});
	}

	return (
		<div className="lr-root">
			<div className="relative z-10 flex w-full max-w-100 flex-col gap-6">
				<header className="lr-logo flex items-center justify-center gap-2.5">
					<span className="lr-dot" aria-hidden="true" />
					<span className="font-berkeley text-base font-medium tracking-[0.14em] text-[#ededf5]">
						leet-review
					</span>
				</header>

				<main className="lr-card">
					<h1 className="mb-2 text-[1.875rem] font-bold leading-none tracking-[-0.035em] text-[#ededf5]">
						Spaced repetition for LeetCode
					</h1>
					<p className="mb-8 text-sm leading-[1.55] text-[rgba(237,237,245,0.5)]">
						Track problems. Review due cards daily. Keep interview patterns
						fresh.
					</p>

					<button
						type="button"
						className="lr-btn"
						onClick={handleSignIn}
						disabled={isLoading}
					>
						{isLoading ? "Connecting..." : "Sign in with GitHub"}
					</button>
				</main>
			</div>
		</div>
	);
}
