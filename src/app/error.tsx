"use client";

import Link from "next/link";
import { useEffect } from "react";

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
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="text-xl font-semibold tracking-tight">
					Something went wrong
				</h1>
				<p className="mt-2 text-sm text-white/75">
					The page failed to render. You can retry or go back to the dashboard.
				</p>
				<div className="mt-4 rounded border border-white/10 bg-black/25 p-3 text-sm text-white/80">
					{error.message}
				</div>
				<div className="mt-5 flex items-center gap-3">
					<button
						type="button"
						onClick={() => reset()}
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
					>
						Retry
					</button>
					<Link
						href="/dashboard"
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
					>
						Go to dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}
