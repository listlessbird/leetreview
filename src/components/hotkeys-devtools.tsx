"use client";

import { TanStackDevtools } from "@tanstack/react-devtools";
import { hotkeysDevtoolsPlugin } from "@tanstack/react-hotkeys-devtools";

const plugins = [hotkeysDevtoolsPlugin()];

export function HotkeysDevtools() {
	return <TanStackDevtools plugins={plugins} />;
}
