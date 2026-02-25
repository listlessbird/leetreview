import "@tanstack/react-start/server-only";

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
	path: "url_slug" | "kv_index";
	cache_hit: boolean;
	upstream_status_code: number | null;
	result_count: number;
};

const QUESTION_META_TTL_SECONDS = 60 * 60 * 24 * 30;
const PROBLEMSET_CACHE_KEY = "leetcode:problemset:v1";

type CachedProblem = {
	slug: string;
	title: string;
	difficulty: string;
	tags: string[];
};

async function getLeetCodeCacheBinding() {
	try {
		const { env } = await import("cloudflare:workers");
		const typedEnv = env as unknown as { LEETCODE_CACHE?: KVNamespace };
		return typedEnv?.LEETCODE_CACHE;
	} catch {
		return undefined;
	}
}

async function cacheGetJson<T>(key: string): Promise<T | null> {
	const cache = await getLeetCodeCacheBinding();
	if (!cache) return null;
	const raw = await cache.get(key);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return null;
	}
}

async function cachePutJson(
	key: string,
	value: unknown,
	expirationTtl: number,
): Promise<void> {
	const cache = await getLeetCodeCacheBinding();
	if (!cache) return;
	await cache.put(key, JSON.stringify(value), { expirationTtl });
}

let problemsetIndexPromise: Promise<CachedProblem[]> | null = null;

async function getProblemsetIndex(): Promise<CachedProblem[]> {
	if (!problemsetIndexPromise) {
		problemsetIndexPromise = (async () => {
			const index = await cacheGetJson<CachedProblem[]>(PROBLEMSET_CACHE_KEY);
			if (!index?.length) {
				throw new Error(
					"LeetCode cache is empty. Populate KV key `leetcode:problemset:v1` first.",
				);
			}
			return index;
		})();
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
		.sort((a, b) => b.score - a.score || a.problem.title.localeCompare(b.problem.title))
		.slice(0, 10);

	return scored.map((item) => toSearchResult(item.problem));
}

export async function fetchLeetCodeQuestion(slug: string) {
	const slugKey = slug.toLowerCase();
	const metaCacheKey = `leetcode:question:v1:${slugKey}`;
	const cached = await cacheGetJson<{
		title: string;
		difficulty: string;
		tags: string[];
	}>(metaCacheKey);
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
	await cachePutJson(metaCacheKey, result, QUESTION_META_TTL_SECONDS);
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
					cache_hit: true,
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
				cache_hit: false,
				upstream_status_code: null,
				result_count: results.length,
			},
		};
	}

	const ranked = rankResults(queryInput, index);
	return {
		results: ranked,
		meta: {
			path: "kv_index",
			cache_hit: false,
			upstream_status_code: null,
			result_count: ranked.length,
		},
	};
}
