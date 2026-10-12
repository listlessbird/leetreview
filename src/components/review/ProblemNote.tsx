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
				"group rounded-lg border bg-muted/50 px-3 py-2 text-sm",
				className,
			)}
		>
			<summary className="cursor-pointer select-none text-muted-foreground text-xs transition-colors hover:text-foreground">
				Check your note
			</summary>
			<p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-6">
				{notes}
			</p>
		</details>
	);
}
