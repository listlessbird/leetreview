import Link from "next/link";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="text-xl font-semibold tracking-tight">Page not found</h1>
				<p className="mt-2 text-sm text-white/75">
					The requested route does not exist.
				</p>
				<div className="mt-5">
					<Link
						href="/"
						className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
					>
						Back home
					</Link>
				</div>
			</div>
		</div>
	);
}
