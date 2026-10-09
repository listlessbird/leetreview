// what each rating means. FSRS treats Hard as a pass, so anything that needed
// the solution (or blew the 25 min stuck limit) has to be Again.
export const RATING_HINTS = {
	Again: "couldn't name the approach, needed the solution, or hit 25 min",
	Hard: "solved it, but slow or buggy",
	Good: "clean solve within time",
	Easy: "instant, could explain it out loud",
} as const;

// the language a review was solved in. recorded on each review log so the
// Java vs Python decision can be made from real data; it does not split cards.
export const SOLVE_LANGUAGES = ["java", "python"] as const;
export type SolveLanguage = (typeof SOLVE_LANGUAGES)[number];

export const DEFAULT_SOLVE_LANGUAGE: SolveLanguage = "java";

export function isSolveLanguage(value: string | null): value is SolveLanguage {
	return SOLVE_LANGUAGES.some((language) => language === value);
}
