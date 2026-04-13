import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

export function extractLeetCodeSlug(url: string) {
	const parsed = new URL(url);
	if (!parsed.hostname.includes("leetcode.com")) {
		throw new Error("Only LeetCode URLs are supported.");
	}

	const match = parsed.pathname.match(/^\/problems\/([^/]+)\/?/i);
	if (!match?.[1]) {
		throw new Error("Invalid LeetCode problem URL.");
	}

	return match[1].toLowerCase();
}

function tryExtractLeetCodeSlug(input: string) {
	try {
		return extractLeetCodeSlug(input);
	} catch {
		return null;
	}
}

function normalizeForMatch(value: string) {
	return value.trim().toLowerCase().replace(/\s+/g, "-");
}

export type SearchResult = {
	title: string;
	slug: string;
	difficulty: string | null;
	url: string;
};

export type SearchExecutionMeta = {
	path: "url_slug" | "local_index";
	cache_hit: boolean;
	upstream_status_code: number | null;
	result_count: number;
};

const DEFAULT_PROBLEMSET_CACHE_PATH = path.join(
	process.cwd(),
	"data",
	"leetcode-cache.json",
);

function getProblemsetCachePath() {
	const configuredPath = process.env.LEETCODE_CACHE_PATH?.trim();

	if (!configuredPath) {
		return DEFAULT_PROBLEMSET_CACHE_PATH;
	}

	return path.resolve(
		/* turbopackIgnore: true */ process.cwd(),
		configuredPath,
	);
}

const PROBLEMSET_CACHE_PATH = getProblemsetCachePath();

type CachedProblem = {
	slug: string;
	title: string;
	difficulty: string;
	tags: string[];
};

const questionMetaCache = new Map<
	string,
	{
		title: string;
		difficulty: string;
		tags: string[];
	}
>();

async function loadProblemsetIndex() {
	try {
		const fileContents = await readFile(PROBLEMSET_CACHE_PATH, "utf8");
		const parsed = JSON.parse(fileContents) as CachedProblem[];
		if (!Array.isArray(parsed) || parsed.length === 0) {
			throw new Error("LeetCode cache file is empty.");
		}
		return parsed;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			throw new Error(
				`LeetCode cache file not found at "${PROBLEMSET_CACHE_PATH}". Run "bun run leetcode:cache" first or set LEETCODE_CACHE_PATH.`,
			);
		}

		throw error;
	}
}

let problemsetIndexPromise: Promise<CachedProblem[]> | null = null;

async function getProblemsetIndex(): Promise<CachedProblem[]> {
	if (!problemsetIndexPromise) {
		problemsetIndexPromise = loadProblemsetIndex();
	}
	return problemsetIndexPromise;
}

function toSearchResult(problem: CachedProblem): SearchResult {
	return {
		title: problem.title,
		slug: problem.slug,
		difficulty: problem.difficulty,
		url: `https://leetcode.com/problems/${problem.slug}/`,
	};
}

function rankResults(queryInput: string, all: CachedProblem[]): SearchResult[] {
	const query = queryInput.trim().toLowerCase();
	const slugQuery = normalizeForMatch(queryInput);
	const queryTokens = query.split(/[\s-]+/).filter(Boolean);

	const scored = all
		.map((problem) => {
			const title = problem.title.toLowerCase();
			const slug = problem.slug.toLowerCase();

			let score = 0;
			if (slug === slugQuery || title === query) score += 200;
			if (slug.startsWith(slugQuery)) score += 120;
			if (title.startsWith(query)) score += 100;
			if (slug.includes(slugQuery)) score += 60;
			if (title.includes(query)) score += 50;
			for (const token of queryTokens) {
				if (slug.includes(token)) score += 10;
				if (title.includes(token)) score += 8;
			}

			return { score, problem };
		})
		.filter((item) => item.score > 0)
		.sort(
			(a, b) =>
				b.score - a.score || a.problem.title.localeCompare(b.problem.title),
		)
		.slice(0, 10);

	return scored.map((item) => toSearchResult(item.problem));
}

export async function fetchLeetCodeQuestion(slug: string) {
	const slugKey = slug.toLowerCase();
	const cached = questionMetaCache.get(slugKey);
	if (cached) {
		return cached;
	}

	const response = await fetch("https://leetcode.com/graphql", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			referer: "https://leetcode.com",
		},
		body: JSON.stringify({
			query:
				"query questionData($titleSlug: String!) { question(titleSlug: $titleSlug) { title difficulty topicTags { name } } }",
			variables: { titleSlug: slugKey },
		}),
	});

	if (!response.ok) {
		throw new Error("Failed to fetch problem metadata from LeetCode.");
	}

	const payload = (await response.json()) as {
		data?: {
			question?: {
				title: string;
				difficulty: string;
				topicTags: { name: string }[];
			} | null;
		};
	};

	const question = payload.data?.question;
	if (!question) {
		throw new Error("Problem not found on LeetCode.");
	}

	const result = {
		title: question.title,
		difficulty: question.difficulty,
		tags: question.topicTags.map((tag) => tag.name),
	};
	questionMetaCache.set(slugKey, result);
	return result;
}

export async function searchLeetCodeProblemsImpl(queryInput: string): Promise<{
	results: SearchResult[];
	meta: SearchExecutionMeta;
}> {
	const index = await getProblemsetIndex();
	const fromUrlSlug = tryExtractLeetCodeSlug(queryInput);
	if (fromUrlSlug) {
		const fromIndex = index.find((problem) => problem.slug === fromUrlSlug);
		if (fromIndex) {
			const results = [toSearchResult(fromIndex)] satisfies SearchResult[];
			return {
				results,
				meta: {
					path: "url_slug",
					cache_hit: questionMetaCache.has(fromUrlSlug),
					upstream_status_code: null,
					result_count: results.length,
				},
			};
		}

		const question = await fetchLeetCodeQuestion(fromUrlSlug);
		const results = [
			{
				title: question.title,
				slug: fromUrlSlug,
				difficulty: question.difficulty,
				url: `https://leetcode.com/problems/${fromUrlSlug}/`,
			},
		] satisfies SearchResult[];
		return {
			results,
			meta: {
				path: "url_slug",
				cache_hit: questionMetaCache.has(fromUrlSlug),
				upstream_status_code: null,
				result_count: results.length,
			},
		};
	}

	const ranked = rankResults(queryInput, index);
	return {
		results: ranked,
		meta: {
			path: "local_index",
			cache_hit: false,
			upstream_status_code: null,
			result_count: ranked.length,
		},
	};
}
