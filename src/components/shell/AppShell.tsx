"use client";

import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { Search, Shuffle } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

import { PlatformChoiceDialog } from "@/components/review/PlatformChoiceDialog";
import { AddProblemDialog } from "@/components/shell/AddProblemDialog";
import { AppSidebar } from "@/components/shell/AppSidebar";
import {
	CommandPalette,
	type PaletteItem,
} from "@/components/shell/CommandPalette";
import { SettingsDialog } from "@/components/shell/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useFocusedCard } from "@/hooks/use-focused-card";
import { useOpenProblem } from "@/hooks/use-open-problem";
import { HOTKEY_LABELS, HOTKEYS } from "@/lib/hotkeys";
import { chooseRandomReview } from "@/lib/random-review";
import {
	type DueCardsResponse,
	fetchDueCards,
	reviewQueryKeys,
} from "@/lib/review.functions";

const PAGE_TITLES: Record<string, string> = {
	"/dashboard": "Today",
	"/problems": "All problems",
	"/add": "Add problem",
};

/**
 * Signed-in chrome: sidebar with today's plan, a slim topbar, the ⌘K palette
 * and the dialogs plus hotkeys every page shares (C add, R random, O open).
 * Seeds the due-cards query so pages read today's plan from the cache.
 */
export function AppShell({
	initialPlan,
	children,
}: {
	initialPlan: DueCardsResponse;
	children: React.ReactNode;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const [addOpen, setAddOpen] = React.useState(false);
	const [settingsOpen, setSettingsOpen] = React.useState(false);
	const [paletteOpen, setPaletteOpen] = React.useState(false);
	const { data: plan } = useQuery({
		queryKey: reviewQueryKeys.dueCards,
		queryFn: fetchDueCards,
		initialData: initialPlan,
		staleTime: 30_000,
	});
	const cards = plan?.cards ?? [];
	const { focused } = useFocusedCard(cards);
	const onToday = pathname === "/dashboard";
	const openProblem = useOpenProblem();
	const dialogOpen = addOpen || settingsOpen || paletteOpen;

	function focusCard(slug: string) {
		router.push(`/dashboard?card=${slug}`);
	}

	function pickRandom() {
		const current = onToday ? focused : null;
		const { problem } = chooseRandomReview({
			problems: cards,
			skippedCardIds: new Set(current ? [current.cardId] : []),
		});
		if (!problem) return;
		focusCard(problem.slug);
		openProblem.open(problem);
	}

	useHotkey(HOTKEYS.commandPalette, () => setPaletteOpen((open) => !open), {
		preventDefault: true,
		meta: { name: "Command palette", description: "Search and run actions" },
	});
	useHotkey(
		HOTKEYS.addProblem,
		() => {
			if (!dialogOpen) setAddOpen(true);
		},
		{
			ignoreInputs: true,
			meta: { name: "Add problem", description: "Open the add dialog" },
		},
	);
	useHotkey(
		HOTKEYS.randomReview,
		() => {
			if (!dialogOpen) pickRandom();
		},
		{
			ignoreInputs: true,
			preventDefault: true,
			meta: {
				name: "Random review",
				description: "Focus and open a random card from today's plan",
			},
		},
	);
	useHotkey(
		HOTKEYS.openProblem,
		() => {
			if (!dialogOpen && onToday && focused) openProblem.open(focused);
		},
		{
			ignoreInputs: true,
			meta: { name: "Open problem", description: "Open the focused problem" },
		},
	);

	const actions: PaletteItem[] = [
		{
			value: "action:random",
			label: "Random review",
			shortcut: HOTKEY_LABELS.randomReview[0],
			run: pickRandom,
		},
		{
			value: "action:add",
			label: "Add problem",
			shortcut: HOTKEY_LABELS.addProblem[0],
			run: () => setAddOpen(true),
		},
		{
			value: "action:today",
			label: "Go to today",
			run: () => router.push("/dashboard"),
		},
		{
			value: "action:problems",
			label: "Go to all problems",
			run: () => router.push("/problems"),
		},
		{
			value: "action:settings",
			label: "Settings",
			run: () => setSettingsOpen(true),
		},
	];
	const planItems: PaletteItem[] = cards.map((card) => ({
		value: `plan:${card.cardId}`,
		label: card.title,
		detail: card.difficulty,
		run: () => focusCard(card.slug),
	}));

	return (
		<SidebarProvider>
			<AppSidebar
				plan={plan}
				focusedCardId={focused?.cardId ?? null}
				onAddProblem={() => setAddOpen(true)}
				onOpenSettings={() => setSettingsOpen(true)}
			/>
			<SidebarInset className="min-h-svh">
				<header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur-md">
					<SidebarTrigger />
					<span className="font-medium text-sm">
						{PAGE_TITLES[pathname] ?? "Review"}
					</span>
					<div className="ml-auto flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={pickRandom}
							disabled={cards.length === 0}
						>
							<Shuffle />
							Random
							<Kbd>{HOTKEY_LABELS.randomReview[0]}</Kbd>
						</Button>
						<Button
							variant="outline"
							size="sm"
							onClick={() => setPaletteOpen(true)}
							className="text-muted-foreground sm:w-56 sm:justify-start"
						>
							<Search />
							<span className="max-sm:sr-only">Search</span>
							<KbdGroup className="ml-auto max-sm:hidden">
								{HOTKEY_LABELS.commandPalette.map((key) => (
									<Kbd key={key}>{key}</Kbd>
								))}
							</KbdGroup>
						</Button>
					</div>
				</header>
				{children}
			</SidebarInset>

			<CommandPalette
				open={paletteOpen}
				onOpenChange={setPaletteOpen}
				actions={actions}
				planItems={planItems}
				onSelectProblem={(cardId) => {
					const planned = cards.find((card) => card.cardId === cardId);
					router.push(
						planned ? `/dashboard?card=${planned.slug}` : `/review/${cardId}`,
					);
				}}
			/>
			<AddProblemDialog open={addOpen} onOpenChange={setAddOpen} />
			<SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
			<PlatformChoiceDialog {...openProblem.choice} />
		</SidebarProvider>
	);
}
