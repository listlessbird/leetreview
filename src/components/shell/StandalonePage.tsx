import type { ReactNode } from "react";

/**
 * Centered card on a soft blue glow, for screens outside the app shell:
 * sign in, not found, and the error boundary.
 */
export function StandalonePage({ children }: { children: ReactNode }) {
	return (
		<div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-background px-4 py-10">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(48rem_20rem_at_top,color-mix(in_srgb,var(--color-blue-500)_12%,transparent),transparent)]"
			/>
			<div className="relative flex w-full max-w-md flex-col gap-6">
				<div className="flex items-center justify-center gap-2">
					<span
						aria-hidden
						className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]"
					/>
					<span className="font-medium font-mono text-sm tracking-wide">
						leet-review
					</span>
				</div>
				<section className="rounded-2xl border bg-card/90 p-6 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-8">
					{children}
				</section>
			</div>
		</div>
	);
}
