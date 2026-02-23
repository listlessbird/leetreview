import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { getSession } from "@/lib/auth.server";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/login")({
	beforeLoad: async () => {
		const session = await getSession();
		if (session) {
			throw redirect({ to: "/" });
		}
	},
	component: LoginPage,
});

function GitHubIcon() {
	return (
		<svg
			viewBox="0 0 24 24"
			width="17"
			height="17"
			fill="currentColor"
			aria-hidden="true"
		>
			<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
		</svg>
	);
}

function LoginPage() {
	const [isLoading, setIsLoading] = useState(false);

	async function handleGitHubSignIn() {
		setIsLoading(true);
		await authClient.signIn.social({
			provider: "github",
			callbackURL: "/",
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
						Welcome back
					</h1>
					<p className="mb-8 text-sm leading-[1.55] text-[rgba(237,237,245,0.38)]">
						Code review for serious developers.
					</p>

					<button
						type="button"
						className="lr-btn"
						onClick={handleGitHubSignIn}
						disabled={isLoading}
						aria-label={
							isLoading ? "Connecting to GitHub" : "Sign in with GitHub"
						}
					>
						{isLoading ? (
							<>
								<span className="lr-spinner" aria-hidden="true" />
								<span>Connecting…</span>
							</>
						) : (
							<>
								<GitHubIcon />
								<span>Continue with GitHub</span>
							</>
						)}
					</button>
				</main>

				<footer className="lr-footer text-center font-berkeley text-[0.6875rem] leading-relaxed tracking-[0.045em] text-[rgba(237,237,245,0.38)]">
					By continuing, you agree to our terms of service
				</footer>
			</div>
		</div>
	);
}
