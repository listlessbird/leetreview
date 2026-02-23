import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const searchInput = z.object({
	query: z.string().trim().min(1).max(300),
});

export const searchLeetCodeProblems = createServerFn({ method: "POST" })
	.inputValidator((data) => searchInput.parse(data))
	.handler(async ({ data }) => {
		const { searchLeetCodeProblemsImpl } = await import("@/lib/leetcode.server");
		return searchLeetCodeProblemsImpl(data.query);
	});
