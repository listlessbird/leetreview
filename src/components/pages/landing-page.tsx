"use client";

import { useState } from "react";
import { SiGithub } from "react-icons/si";

import { StandalonePage } from "@/components/shell/StandalonePage";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { authClient } from "@/lib/auth-client";

export function LandingPage({
	redirectTo = "/dashboard",
}: {
	redirectTo?: string;
}) {
	const [isLoading, setIsLoading] = useState(false);

	async function handleSignIn() {
		setIsLoading(true);
		try {
			await authClient.signIn.social({
				provider: "github",
				callbackURL: redirectTo,
			});
		} finally {
			setIsLoading(false);
		}
	}

	return (
		<StandalonePage>
			<h1 className="font-semibold text-2xl tracking-tight">
				Spaced repetition for LeetCode
			</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				Track problems. Review a small plan every day. Keep interview patterns
				fresh.
			</p>
			<Button
				size="lg"
				className="mt-8 w-full"
				onClick={handleSignIn}
				disabled={isLoading}
			>
				{isLoading ? <Spinner /> : <SiGithub />}
				{isLoading ? "Connecting..." : "Sign in with GitHub"}
			</Button>
		</StandalonePage>
	);
}
