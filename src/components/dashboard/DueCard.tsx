import { Link } from "@tanstack/react-router";

type Card = {
	cardId: string;
	title: string;
	difficulty: string;
	tags: string[];
};

export function DueCard({ card }: { card: Card }) {
	return (
		<li className="rounded border border-white/10 bg-white/5 p-4">
			<div className="mb-2 flex items-center justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold">{card.title}</h2>
					<p className="text-xs uppercase tracking-wide text-white/60">
						{card.difficulty}
					</p>
				</div>
				<Link
					to="/review/$cardId"
					params={{ cardId: card.cardId }}
					className="rounded border border-white/20 px-3 py-2 text-sm hover:bg-white/10"
				>
					Review
				</Link>
			</div>
			<div className="flex flex-wrap gap-2">
				{card.tags.map((tag) => (
					<span
						key={tag}
						className="rounded border border-white/15 px-2 py-1 text-xs text-white/70"
					>
						{tag}
					</span>
				))}
			</div>
		</li>
	);
}
