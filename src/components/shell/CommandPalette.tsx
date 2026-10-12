"use client";

import { useQuery } from "@tanstack/react-query";
import { Fragment } from "react";

import {
	Command,
	CommandCollection,
	CommandDialog,
	CommandDialogPopup,
	CommandEmpty,
	CommandGroup,
	CommandGroupLabel,
	CommandInput,
	CommandItem,
	CommandList,
	CommandPanel,
	CommandSeparator,
	CommandShortcut,
} from "@/components/ui/command";
import { fetchProblems, reviewQueryKeys } from "@/lib/review.functions";

export type PaletteItem = {
	value: string;
	label: string;
	detail?: string;
	shortcut?: string;
	run: () => void;
};

type PaletteGroup = { value: string; items: PaletteItem[] };

/**
 * ⌘K: shell actions, today's plan, and every tracked problem. Problems load
 * the first time the palette opens and are then served from the query cache.
 */
export function CommandPalette({
	open,
	onOpenChange,
	actions,
	planItems,
	onSelectProblem,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	actions: PaletteItem[];
	planItems: PaletteItem[];
	onSelectProblem: (cardId: string) => void;
}) {
	const { data: problems = [] } = useQuery({
		queryKey: reviewQueryKeys.problems,
		queryFn: fetchProblems,
		staleTime: 30_000,
		enabled: open,
	});

	const groups: PaletteGroup[] = [
		{ value: "Today", items: planItems },
		{ value: "Actions", items: actions },
		{
			value: "Problems",
			items: problems.map((problem) => ({
				value: `problem:${problem.cardId}`,
				label: problem.title,
				detail: problem.difficulty,
				run: () => onSelectProblem(problem.cardId),
			})),
		},
	].filter((group) => group.items.length > 0);

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange}>
			<CommandDialogPopup>
				<Command items={groups}>
					<CommandInput placeholder="Search problems and actions..." />
					<CommandPanel>
						<CommandEmpty>No results found.</CommandEmpty>
						<CommandList>
							{(group: PaletteGroup) => (
								<Fragment key={group.value}>
									<CommandGroup items={group.items}>
										<CommandGroupLabel>{group.value}</CommandGroupLabel>
										<CommandCollection>
											{(item: PaletteItem) => (
												<CommandItem
													key={item.value}
													value={item.value}
													onClick={() => {
														onOpenChange(false);
														item.run();
													}}
												>
													<span className="flex-1 truncate">{item.label}</span>
													{item.detail ? (
														<span className="font-mono text-2xs text-muted-foreground uppercase">
															{item.detail}
														</span>
													) : null}
													{item.shortcut ? (
														<CommandShortcut>{item.shortcut}</CommandShortcut>
													) : null}
												</CommandItem>
											)}
										</CommandCollection>
									</CommandGroup>
									<CommandSeparator />
								</Fragment>
							)}
						</CommandList>
					</CommandPanel>
				</Command>
			</CommandDialogPopup>
		</CommandDialog>
	);
}
