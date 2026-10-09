import { cn } from "@/lib/utils";

/**
 * The learner's approach note, collapsed by default so recall is attempted
 * before peeking. Renders nothing when the problem has no note yet.
 */
export function ProblemNote({
	notes,
	className,
}: {
	notes: string | null;
	className?: string;
}) {
	if (!notes) return null;

	return (
		<details
			className={cn(
				"group rounded border border-white/10 bg-black/20 px-3 py-2 text-sm text-white/75",
				className,
			)}
		>
			<summary className="cursor-pointer select-none text-xs uppercase tracking-wide text-white/45 hover:text-white/70">
				Check your note
			</summary>
			<p className="mt-2 whitespace-pre-wrap leading-6">{notes}</p>
		</details>
	);
}
