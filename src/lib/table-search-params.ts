import { z } from "zod";

export const sortItemSchema = z.object({
	id: z.string(),
	desc: z.boolean(),
});

export const tableSearchSchema = z.object({
	q: z.string().default("").catch(""),
	sort: z.array(sortItemSchema).default([]).catch([]),
	page: z.number().int().positive().default(1).catch(1),
	perPage: z.number().int().positive().default(10).catch(10),
});

export type TableSearch = z.infer<typeof tableSearchSchema>;
