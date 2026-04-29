import "server-only";
import neetcodeCacheData from "../../data/neetcode-cache.json";

const neetcodeCache = neetcodeCacheData as Record<string, string>;

export async function getNeetcodeUrl(slug: string): Promise<string | null> {
	return neetcodeCache[slug] || null;
}
