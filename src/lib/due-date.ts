import {
	differenceInCalendarDays,
	format,
	formatDistanceToNow,
	formatRelative,
} from "date-fns";

const THIRTY_SECONDS_MS = 30 * 1000;
const FIVE_MINUTES_MS = 5 * 60 * 1000;
const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export function formatDueRelative(dueDate: Date, now: Date) {
	const dayDistance = Math.abs(differenceInCalendarDays(dueDate, now));
	if (dayDistance <= 6) {
		return formatRelative(dueDate, now);
	}
	return formatDistanceToNow(dueDate, { addSuffix: true });
}

export function formatDueExact(dueDate: Date) {
	return format(dueDate, "PPp");
}

export function getDueRefreshIntervalMs(dueDate: Date, now: Date) {
	const deltaMs = Math.abs(dueDate.getTime() - now.getTime());
	if (deltaMs < ONE_HOUR_MS) return THIRTY_SECONDS_MS;
	if (deltaMs < ONE_DAY_MS) return FIVE_MINUTES_MS;
	return THIRTY_MINUTES_MS;
}

export function getNextDueRefreshMs(dueUnixList: number[], nowMs: number) {
	if (dueUnixList.length === 0) return THIRTY_MINUTES_MS;

	let minInterval = THIRTY_MINUTES_MS;
	const now = new Date(nowMs);

	for (const dueUnix of dueUnixList) {
		const dueDate = new Date(dueUnix * 1000);
		const candidate = getDueRefreshIntervalMs(dueDate, now);
		if (candidate < minInterval) {
			minInterval = candidate;
		}
		if (minInterval === THIRTY_SECONDS_MS) break;
	}

	return minInterval;
}
