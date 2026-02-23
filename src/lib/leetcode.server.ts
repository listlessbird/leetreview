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
	path: "url_slug" | "api_search";
	cache_hit: boolean;
	upstream_status_code: number | null;
	result_count: number;
};

const QUESTION_META_TTL_SECONDS = 60 * 60 * 24 * 30;
const SEARCH_RESULTS_TTL_SECONDS = 60 * 60 * 24 * 30;

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
	const fromUrlSlug = tryExtractLeetCodeSlug(queryInput);
	if (fromUrlSlug) {
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

	const normalizedQuery = queryInput.trim().toLowerCase();
	const searchCacheKey = `leetcode:search:v1:${normalizedQuery}`;
	const cachedResults = await cacheGetJson<SearchResult[]>(searchCacheKey);
	if (cachedResults) {
		return {
			results: cachedResults,
			meta: {
				path: "api_search",
				cache_hit: true,
				upstream_status_code: null,
				result_count: cachedResults.length,
			},
		};
	}

	const response = await fetch(
		"https://leetcode-api-pied.vercel.app/search?query=" +
			encodeURIComponent(queryInput),
		{
			method: "GET",
			headers: {
				accept: "application/json",
			},
		},
	);

	const rawText = await response.text();
	if (!response.ok) {
		throw new Error("Failed to search LeetCode problems.");
	}

	const payload = JSON.parse(rawText) as {
		title?: string;
		title_slug?: string;
		url?: string;
	}[];
	const query = queryInput.trim().toLowerCase();
	const slugQuery = normalizeForMatch(queryInput);

	const ranked = payload
		.map((question) => ({
			title: question.title ?? "",
			slug: question.title_slug ?? "",
			difficulty: null as string | null,
			url:
				question.url ??
				(question.title_slug
					? `https://leetcode.com/problems/${question.title_slug}/`
					: ""),
		}))
		.filter((question) => Boolean(question.title && question.slug && question.url))
		.slice(0, 10)
		.sort((a, b) => {
			const aTitle = a.title.toLowerCase();
			const bTitle = b.title.toLowerCase();
			const aExact = a.slug === slugQuery || aTitle === query;
			const bExact = b.slug === slugQuery || bTitle === query;
			if (aExact !== bExact) return aExact ? -1 : 1;

			const aPrefix = a.slug.startsWith(slugQuery) || aTitle.startsWith(query);
			const bPrefix = b.slug.startsWith(slugQuery) || bTitle.startsWith(query);
			if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;

			const aContains = a.slug.includes(slugQuery) || aTitle.includes(query);
			const bContains = b.slug.includes(slugQuery) || bTitle.includes(query);
			if (aContains !== bContains) return aContains ? -1 : 1;

			return a.title.localeCompare(b.title);
		});
	await cachePutJson(searchCacheKey, ranked, SEARCH_RESULTS_TTL_SECONDS);
	return {
		results: ranked,
		meta: {
			path: "api_search",
			cache_hit: false,
			upstream_status_code: response.status,
			result_count: ranked.length,
		},
	};
}
