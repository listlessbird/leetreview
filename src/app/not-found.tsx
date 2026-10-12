import Link from "next/link";

import { StandalonePage } from "@/components/shell/StandalonePage";
import { Button } from "@/components/ui/button";

export default function NotFound() {
	return (
		<StandalonePage>
			<h1 className="font-semibold text-xl tracking-tight">Page not found</h1>
			<p className="mt-2 text-muted-foreground text-sm">
				The requested route does not exist.
			</p>
			<Button variant="outline" className="mt-6" render={<Link href="/" />}>
				Back home
			</Button>
		</StandalonePage>
	);
}
