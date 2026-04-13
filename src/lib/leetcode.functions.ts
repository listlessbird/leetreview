import { z } from "zod";

const searchInput = z.object({
	query: z.string().trim().min(1).max(300),
});

type SearchResult = {
	title: string;
	slug: string;
	difficulty: string | null;
	url: string;
};

async function readErrorMessage(
	response: Response,
	fallback: string,
): Promise<string> {
	try {
		const payload = (await response.json()) as { error?: string };
		return payload.error ?? fallback;
	} catch {
		return fallback;
	}
}

export async function searchLeetCodeProblems({
	data,
}: {
	data: { query: string };
}) {
	const body = searchInput.parse(data);
	const response = await fetch("/api/leetcode/search", {
		method: "POST",
		headers: {
			"content-type": "application/json",
		},
		body: JSON.stringify(body),
	});

	if (!response.ok) {
		throw new Error(
			await readErrorMessage(response, "Could not search problems."),
		);
	}

	return (await response.json()) as SearchResult[];
}
