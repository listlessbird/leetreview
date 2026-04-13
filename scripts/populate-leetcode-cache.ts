
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const GRAPHQL_URL = "https://leetcode.com/graphql/";
const PAGE_SIZE = 100;
const OUTPUT_PATH =
	process.env.LEETCODE_CACHE_PATH?.trim() || "data/leetcode-cache.json";

const PROBLEMSET_QUERY = `
	query problemsetQuestionListV2(
		$filters: QuestionFilterInput
		$limit: Int
		$searchKeyword: String
		$skip: Int
		$sortBy: QuestionSortByInput
		$categorySlug: String
	) {
		problemsetQuestionListV2(
			filters: $filters
			limit: $limit
			searchKeyword: $searchKeyword
			skip: $skip
			sortBy: $sortBy
			categorySlug: $categorySlug
		) {
			questions {
				titleSlug
				title
				difficulty
				topicTags {
					name
				}
			}
			totalLength
			hasMore
		}
	}
`;

type Question = {
	titleSlug: string;
	title: string;
	difficulty: string;
	topicTags: { name: string }[];
};

type ProblemsetQuestionListV2Response = {
	data?: {
		problemsetQuestionListV2?: {
			totalLength: number;
			hasMore: boolean;
			questions: Question[];
		};
	};
};

const EMPTY_FILTERS = {
	filterCombineType: "ALL",
	statusFilter: { questionStatuses: [], operator: "IS" },
	difficultyFilter: { difficulties: [], operator: "IS" },
	languageFilter: { languageSlugs: [], operator: "IS" },
	topicFilter: { topicSlugs: [], operator: "IS" },
	acceptanceFilter: {},
	frequencyFilter: {},
	frontendIdFilter: {},
	lastSubmittedFilter: {},
	publishedFilter: {},
	companyFilter: { companySlugs: [], operator: "IS" },
	positionFilter: { positionSlugs: [], operator: "IS" },
	positionLevelFilter: { positionLevelSlugs: [], operator: "IS" },
	contestPointFilter: { contestPoints: [], operator: "IS" },
	premiumFilter: { premiumStatus: [], operator: "IS" },
};

async function fetchPage(skip: number): Promise<ProblemsetQuestionListV2Response> {
	const response = await fetch(GRAPHQL_URL, {
		method: "POST",
		headers: {
			accept: "*/*",
			"content-type": "application/json",
			origin: "https://leetcode.com",
			referer: "https://leetcode.com/problemset/",
		},
		body: JSON.stringify({
			query: PROBLEMSET_QUERY,
			variables: {
				skip,
				limit: PAGE_SIZE,
				categorySlug: "all-code-essentials",
				filters: EMPTY_FILTERS,
				searchKeyword: "",
				sortBy: { sortField: "CUSTOM", sortOrder: "ASCENDING" },
				filtersV2: EMPTY_FILTERS,
			},
			operationName: "problemsetQuestionListV2",
		}),
	});

	if (!response.ok) {
		console.error(await response.text());
		throw new Error(`LeetCode API returned ${response.status}`);
	}

	return (await response.json()) as ProblemsetQuestionListV2Response;
}

async function fetchAllProblems(): Promise<Question[]> {
	const questions: Question[] = [];
	let skip = 0;
	let total = 0;

	while (true) {
		const payload = await fetchPage(skip);
		const list = payload.data?.problemsetQuestionListV2;
		if (!list?.questions) {
			throw new Error("Unexpected response shape from LeetCode");
		}

		total = list.totalLength;
		questions.push(...list.questions);
		console.log(`Fetched ${questions.length} / ${total} problems`);

		if (!list.hasMore || list.questions.length === 0) {
			break;
		}

		skip += PAGE_SIZE;
	}

	return questions;
}

async function main() {
	const problems = await fetchAllProblems();

	const index = problems.map((q) => ({
		slug: q.titleSlug,
		title: q.title,
		difficulty: q.difficulty,
		tags: q.topicTags.map((t) => t.name),
	}));

	await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
	await writeFile(OUTPUT_PATH, JSON.stringify(index), "utf8");
	console.log(`Wrote ${index.length} problems to ${OUTPUT_PATH}`);
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
