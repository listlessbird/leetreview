"use client";

import Link from "next/link";
import { useEffect } from "react";

import { StandalonePage } from "@/components/shell/StandalonePage";
import { Button } from "@/components/ui/button";

export default function GlobalError({
	error,
	reset,
}: {
	error: Error & { digest?: string };
	reset: () => void;
}) {
	useEffect(() => {
		console.error(error);
	}, [error]);

	return (
		<StandalonePage>
			<h1 className="font-semibold text-xl tracking-tight">
				Something went wrong
			</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				The page failed to render. Retry, or head back to today's plan.
			</p>
			<pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/50 p-3 font-mono text-destructive-foreground text-xs">
				{error.message}
			</pre>
			<div className="mt-6 flex items-center gap-2">
				<Button onClick={() => reset()}>Retry</Button>
				<Button variant="outline" render={<Link href="/dashboard" />}>
					Go to today
				</Button>
			</div>
		</StandalonePage>
	);
}
