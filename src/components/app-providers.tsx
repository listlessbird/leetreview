"use client";

import { HotkeysProvider } from "@tanstack/react-hotkeys";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

// Loaded only in the browser — the SolidJS-based devtools panel cannot run
// during SSR (solid-js/web resolves to its server build which is missing
// browser-only exports like setStyleProperty).
const HotkeysDevtools =
	process.env.NODE_ENV === "development"
		? dynamic(
				() =>
					import("@/components/hotkeys-devtools").then(
						(m) => m.HotkeysDevtools,
					),
				{ ssr: false },
			)
		: null;

export function AppProviders({ children }: { children: React.ReactNode }) {
	const [queryClient] = useState(() => new QueryClient());

	return (
		<HotkeysProvider>
			<QueryClientProvider client={queryClient}>
				<TooltipProvider>{children}</TooltipProvider>
			</QueryClientProvider>
			{HotkeysDevtools && <HotkeysDevtools />}
		</HotkeysProvider>
	);
}
