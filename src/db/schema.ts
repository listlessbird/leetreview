import {
	index,
	integer,
	real,
	sqliteTable,
	text,
	uniqueIndex,
} from "drizzle-orm/sqlite-core";
import * as authSchema from "./auth.schema";

export const problems = sqliteTable(
	"problems",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authSchema.users.id, { onDelete: "cascade" }),
		slug: text("slug").notNull(),
		title: text("title").notNull(),
		difficulty: text("difficulty").notNull(),
		tags: text("tags").notNull(),
		url: text("url").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		index("problems_user_id_idx").on(table.userId),
		uniqueIndex("problems_user_slug_unique").on(table.userId, table.slug),
	],
);

export const cards = sqliteTable(
	"cards",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => authSchema.users.id, { onDelete: "cascade" }),
		problemId: text("problem_id")
			.notNull()
			.references(() => problems.id, { onDelete: "cascade" }),
		due: integer("due").notNull(),
		stability: real("stability").notNull(),
		difficulty: real("difficulty").notNull(),
		elapsedDays: integer("elapsed_days").notNull(),
		scheduledDays: integer("scheduled_days").notNull(),
		learningSteps: integer("learning_steps").notNull(),
		reps: integer("reps").notNull(),
		lapses: integer("lapses").notNull(),
		state: integer("state").notNull(),
		lastReview: integer("last_review"),
	},
	(table) => [
		index("cards_user_due_idx").on(table.userId, table.due),
		index("cards_problem_id_idx").on(table.problemId),
		uniqueIndex("cards_problem_unique").on(table.problemId),
	],
);

export const reviewLogs = sqliteTable(
	"review_logs",
	{
		id: text("id").primaryKey(),
		cardId: text("card_id")
			.notNull()
			.references(() => cards.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => authSchema.users.id, { onDelete: "cascade" }),
		rating: integer("rating").notNull(),
		state: integer("state").notNull(),
		due: integer("due").notNull(),
		stability: real("stability").notNull(),
		difficulty: real("difficulty").notNull(),
		elapsedDays: integer("elapsed_days").notNull(),
		lastElapsedDays: integer("last_elapsed_days").notNull(),
		scheduledDays: integer("scheduled_days").notNull(),
		learningSteps: integer("learning_steps").notNull(),
		review: integer("review").notNull(),
	},
	(table) => [
		index("review_logs_card_id_idx").on(table.cardId),
		index("review_logs_user_review_idx").on(table.userId, table.review),
	],
);

export const schema = {
	...authSchema,
	problems,
	cards,
	reviewLogs,
} as const;
