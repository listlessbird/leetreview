"use client";

import { CalendarCheck, ListTree, Plus, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { DifficultyDot } from "@/components/review/problem-meta";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { HOTKEY_LABELS } from "@/lib/hotkeys";
import type { DueCardsResponse } from "@/lib/review.functions";

/**
 * Navigation plus today's plan as a list, the way T3 Code lists threads.
 * Each queue row links into the focus view; digits 1–9 select them there.
 */
export function AppSidebar({
	plan,
	focusedCardId,
	onAddProblem,
	onOpenSettings,
}: {
	plan: DueCardsResponse | undefined;
	focusedCardId: string | null;
	onAddProblem: () => void;
	onOpenSettings: () => void;
}) {
	const pathname = usePathname();
	const cards = plan?.cards ?? [];
	const summary = plan?.summary;

	return (
		<Sidebar>
			<SidebarHeader className="h-12 flex-row items-center gap-2 px-4">
				<span
					aria-hidden
					className="size-1.5 rounded-full bg-primary shadow-[0_0_10px_var(--color-primary)]"
				/>
				<span className="font-medium font-mono text-foreground text-sm tracking-wide">
					leet-review
				</span>
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={pathname === "/dashboard"}
								render={<Link href="/dashboard" />}
							>
								<CalendarCheck />
								<span>Today</span>
							</SidebarMenuButton>
							{summary ? (
								<SidebarMenuBadge className="font-mono">
									{summary.plannedCount}/{summary.dailyReviewCount}
								</SidebarMenuBadge>
							) : null}
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton
								isActive={pathname === "/problems"}
								render={<Link href="/problems" />}
							>
								<ListTree />
								<span>All problems</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
						<SidebarMenuItem>
							<SidebarMenuButton onClick={onAddProblem}>
								<Plus />
								<span>Add problem</span>
							</SidebarMenuButton>
							<SidebarMenuBadge>
								<Kbd>{HOTKEY_LABELS.addProblem[0]}</Kbd>
							</SidebarMenuBadge>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarGroup>

				<SidebarGroup>
					<SidebarGroupLabel className="justify-between">
						Today's plan
						{summary && summary.waitingCount > 0 ? (
							<span className="font-mono text-2xs text-muted-foreground">
								{summary.waitingCount} waiting
							</span>
						) : null}
					</SidebarGroupLabel>
					{cards.length === 0 ? (
						<p className="px-2 py-1 text-muted-foreground text-xs">
							Nothing due. Nice.
						</p>
					) : (
						<SidebarMenu>
							{cards.map((card, index) => (
								<SidebarMenuItem key={card.cardId}>
									<SidebarMenuButton
										isActive={
											pathname === "/dashboard" && card.cardId === focusedCardId
										}
										render={<Link href={`/dashboard?card=${card.slug}`} />}
									>
										<DifficultyDot difficulty={card.difficulty} />
										<span>{card.title}</span>
									</SidebarMenuButton>
									{index < 9 ? (
										<SidebarMenuBadge>
											<Kbd className="font-mono">{index + 1}</Kbd>
										</SidebarMenuBadge>
									) : null}
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					)}
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<UserButton onClick={onOpenSettings} />
			</SidebarFooter>
		</Sidebar>
	);
}

function UserButton({ onClick }: { onClick: () => void }) {
	const session = authClient.useSession();
	const user = session.data?.user;
	const label = user?.name ?? user?.email ?? "Signed in";

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SidebarMenuButton size="lg" onClick={onClick}>
					<Avatar className="size-7">
						{user?.image ? <AvatarImage src={user.image} alt="" /> : null}
						<AvatarFallback className="text-xs">
							{getInitials(label)}
						</AvatarFallback>
					</Avatar>
					<span className="min-w-0 flex-1 truncate">{label}</span>
					<Settings className="text-muted-foreground" />
				</SidebarMenuButton>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}

function getInitials(label: string) {
	const initials = label
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
	return initials || "U";
}
