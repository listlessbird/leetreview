import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Registers digit-based keyboard shortcuts for table row navigation.
 *
 * Pressing a digit (1-9) starts a 600 ms accumulation window. Additional
 * digits pressed within that window extend the number (e.g. "1" → "0"
 * becomes row 10). After the window closes the accumulated number is used
 * as a 1-based row index.
 *
 * Keypresses inside <input>, <textarea>, <select>, or contenteditable
 * elements are ignored.
 */
export function useRowNavHotkeys(
	rows: Array<{ href: string }>,
	enabled = true,
) {
	const router = useRouter();
	const bufferRef = useRef("");
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Stabilise rows reference so the effect doesn't re-run on every render.
	const rowsRef = useRef(rows);
	rowsRef.current = rows;

	useEffect(() => {
		if (!enabled) return;

		function onKeyDown(e: KeyboardEvent) {
			const target = e.target as HTMLElement;
			const tag = target.tagName;
			if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
			if (target.isContentEditable) return;
			if (!/^\d$/.test(e.key)) return;

			e.preventDefault();
			bufferRef.current += e.key;

			if (timerRef.current) clearTimeout(timerRef.current);
			timerRef.current = setTimeout(() => {
				const index = parseInt(bufferRef.current, 10) - 1;
				bufferRef.current = "";
				const row = rowsRef.current[index];
				if (row) router.push(row.href);
			}, 600);
		}

		window.addEventListener("keydown", onKeyDown);
		return () => {
			window.removeEventListener("keydown", onKeyDown);
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [enabled, router]);
}
