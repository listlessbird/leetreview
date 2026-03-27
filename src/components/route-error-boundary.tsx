import {
	ErrorComponent,
	Link,
	type ErrorComponentProps,
} from "@tanstack/react-router";

type RouteErrorBoundaryProps = ErrorComponentProps & {
	title?: string;
};

export function RouteErrorBoundary({
	error,
	reset,
	title = "Something went wrong",
}: RouteErrorBoundaryProps) {
	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="text-xl font-semibold tracking-tight">{title}</h1>
				<p className="mt-2 text-sm text-white/75">
					The route failed to render. You can retry or go back to dashboard.
				</p>
				<div className="mt-4 rounded border border-white/10 bg-black/25 p-3 text-sm text-white/80">
					<ErrorComponent error={error} />
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
						to="/dashboard"
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
					>
						Go to dashboard
					</Link>
				</div>
			</div>
		</div>
	);
}
