import * as React from "react";
import { getNextDueRefreshMs } from "@/lib/due-date";

export function useAdaptiveNow(dueUnixList: number[]) {
	const [nowMs, setNowMs] = React.useState(() => Date.now());

	const refreshMs = React.useMemo(
		() => getNextDueRefreshMs(dueUnixList, nowMs),
		[dueUnixList, nowMs],
	);

	React.useEffect(() => {
		const timer = window.setTimeout(() => {
			setNowMs(Date.now());
		}, refreshMs);

		return () => window.clearTimeout(timer);
	}, [refreshMs]);

	return nowMs;
}
