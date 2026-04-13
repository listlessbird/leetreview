import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/components/app-providers";

import "./globals.css";

export const metadata: Metadata = {
	title: {
		default: "leet-review",
		template: "%s | leet-review",
	},
	description:
		"Personal spaced repetition for LeetCode interview prep. Built by listlessbird.",
	applicationName: "leet-review",
	authors: [{ name: "listlessbird" }],
	manifest: "/site.webmanifest",
	icons: {
		icon: [
			{
				type: "image/png",
				sizes: "96x96",
				url: "/favicon-96x96.png",
			},
			{
				type: "image/svg+xml",
				url: "/favicon.svg",
			},
			{
				rel: "shortcut icon",
				url: "/favicon.ico",
			},
		],
		apple: "/apple-touch-icon.png",
	},
	openGraph: {
		siteName: "leet-review",
		type: "website",
		title: "leet-review",
		description:
			"Personal spaced repetition for LeetCode interview prep. Built by listlessbird.",
	},
	twitter: {
		card: "summary",
		creator: "@listlessbird",
	},
};

export const viewport: Viewport = {
	colorScheme: "dark",
	themeColor: "#07070e",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className="bg-[#07070e] text-[#ededf5] antialiased">
				<AppProviders>{children}</AppProviders>
			</body>
		</html>
	);
}
