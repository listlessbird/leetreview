import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_NEETCODE_CACHE_PATH = path.join(
	process.cwd(),
	"data",
	"neetcode-cache.json",
);

function getNeetcodeCachePath() {
	const configuredPath = process.env.NEETCODE_CACHE_PATH?.trim();

	if (!configuredPath) {
		return DEFAULT_NEETCODE_CACHE_PATH;
	}

	return path.resolve(
		/* turbopackIgnore: true */ process.cwd(),
		configuredPath,
	);
}

const NEETCODE_CACHE_PATH = getNeetcodeCachePath();

let neetcodeIndexPromise: Promise<Record<string, string>> | null = null;

async function loadNeetcodeIndex(): Promise<Record<string, string>> {
	try {
		const fileContents = await readFile(NEETCODE_CACHE_PATH, "utf8");
		const parsed = JSON.parse(fileContents) as Record<string, string>;
		if (!parsed || typeof parsed !== "object") {
			throw new Error("NeetCode cache file is invalid.");
		}
		return parsed;
	} catch (error) {
		if (error instanceof Error && "code" in error && error.code === "ENOENT") {
			console.warn(
				`NeetCode cache file not found at "${NEETCODE_CACHE_PATH}". NeetCode links will not be attached.`,
			);
			return {};
		}
		throw error;
	}
}

export async function getNeetcodeUrl(slug: string): Promise<string | null> {
	if (!neetcodeIndexPromise) {
		neetcodeIndexPromise = loadNeetcodeIndex();
	}
	const index = await neetcodeIndexPromise;
	return index[slug] || null;
}
