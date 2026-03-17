import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
	Blocks,
	Plus,
	Search,
	X,
	type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiLeetcode } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { searchLeetCodeProblems } from "@/lib/leetcode.functions";
import {
	addProblemFromUrl,
	addSystemDesignProblem,
} from "@/lib/review.functions";
import { cn } from "@/lib/utils";

type SearchResult = {
	title: string;
	slug: string;
	difficulty: string | null;
	url: string;
};

type ProblemTab = "leetcode" | "system-design";

type SystemDesignFormValues = {
	title: string;
	difficulty: "Easy" | "Medium" | "Hard";
	tags: string;
	resources: Array<{
		url: string;
		title: string;
	}>;
};

type TabOption = {
	value: ProblemTab;
	label: string;
	icon: LucideIcon | typeof SiLeetcode;
	iconClassName: string;
};

const DEFAULT_SYSTEM_DESIGN_VALUES: SystemDesignFormValues = {
	title: "",
	difficulty: "Medium",
	tags: "",
	resources: [{ url: "", title: "" }],
};

const TAB_OPTIONS: TabOption[] = [
	{
		value: "leetcode",
		label: "LeetCode",
		icon: SiLeetcode,
		iconClassName: "text-[#FFA116]",
	},
	{
		value: "system-design",
		label: "System Design",
		icon: Blocks,
		iconClassName: "text-white/72",
	},
];

const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;
const FIELD_CLASS_NAME =
	"h-10 rounded-none border-white/12 bg-transparent text-[#f4f5f8] placeholder:text-white/40 focus-visible:border-white/24 focus-visible:ring-white/12";

function TabButton({
	option,
	activeTab,
	shouldReduceMotion,
}: {
	option: TabOption;
	activeTab: ProblemTab;
	shouldReduceMotion: boolean;
}) {
	const isActive = activeTab === option.value;
	const Icon = option.icon;

	return (
		<TabsTrigger
			value={option.value}
			className="relative !h-10 !w-full !justify-start rounded-none border border-white/10 bg-transparent p-0 text-left shadow-none after:hidden data-[state=active]:bg-transparent data-[state=active]:shadow-none"
		>
			{isActive ? (
				<motion.span
					layoutId="add-problem-active-tab"
					className="absolute inset-0 border border-white/16 bg-white/[0.08]"
					transition={
						shouldReduceMotion
							? { duration: 0 }
							: { type: "spring", stiffness: 420, damping: 38, mass: 0.8 }
					}
				/>
			) : null}

			<span
				className={cn(
					"relative flex w-full items-center gap-2 px-3 text-sm",
					isActive ? "text-white" : "text-white/60",
				)}
			>
				<Icon className={cn("size-3.5 shrink-0", option.iconClassName)} />
				<span>{option.label}</span>
			</span>
		</TabsTrigger>
	);
}

function ResultItem({
	result,
	isPending,
	pendingSlug,
	onAdd,
}: {
	result: SearchResult;
	isPending: boolean;
	pendingSlug: string | undefined;
	onAdd: (slug: string) => void;
}) {
	const isThis = isPending && pendingSlug === result.slug;

	return (
		<motion.li
			layout
			initial={{ opacity: 0, y: 6 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.16, ease: EASE_OUT }}
			className="border border-white/10 bg-black/10 p-3"
		>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm text-[#f4f5f8]">{result.title}</p>
					<div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/45">
						{result.difficulty ? (
							<span className="uppercase tracking-[0.18em]">
								{result.difficulty}
							</span>
						) : null}
						<span className="truncate normal-case tracking-normal">
							{result.slug}
						</span>
					</div>
				</div>

				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => onAdd(result.slug)}
					disabled={isPending}
					className="rounded-none border-white/15 bg-transparent text-[#f4f5f8] hover:bg-white/[0.06]"
				>
					{isThis ? <Spinner className="size-3" /> : "Add"}
				</Button>
			</div>
		</motion.li>
	);
}

export function AddProblemTabs({
	onAdded,
	onSuccess,
	searchAutoFocus = false,
}: {
	onAdded: () => void | Promise<void>;
	onSuccess?: () => void | Promise<void>;
	searchAutoFocus?: boolean;
}) {
	const [activeTab, setActiveTab] = useState<ProblemTab>("leetcode");
	const [searchQuery, setSearchQuery] = useState("");
	const [isSearching, setIsSearching] = useState(false);
	const [searchError, setSearchError] = useState<string | null>(null);
	const [results, setResults] = useState<SearchResult[]>([]);
	const [systemDesignError, setSystemDesignError] = useState<string | null>(
		null,
	);
	const shouldReduceMotion = useReducedMotion();

	const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
	const searchGenerationRef = useRef(0);

	useEffect(() => {
		return () => clearTimeout(searchTimerRef.current);
	}, []);

	function handleSearchChange(query: string) {
		setSearchQuery(query);
		clearTimeout(searchTimerRef.current);

		const trimmed = query.trim();
		if (trimmed.length < 2) {
			setResults([]);
			setSearchError(null);
			return;
		}

		const generation = ++searchGenerationRef.current;
		searchTimerRef.current = setTimeout(async () => {
			setIsSearching(true);
			setSearchError(null);
			try {
				const found = await searchLeetCodeProblems({
					data: { query: trimmed },
				});
				if (generation === searchGenerationRef.current) {
					setResults(found);
				}
			} catch (error) {
				if (generation === searchGenerationRef.current) {
					setResults([]);
					setSearchError(
						error instanceof Error
							? error.message
							: "Could not search problems.",
					);
				}
			} finally {
				if (generation === searchGenerationRef.current) {
					setIsSearching(false);
				}
			}
		}, 300);
	}

	function handleTabChange(value: string) {
		setActiveTab(value as ProblemTab);
		clearTimeout(searchTimerRef.current);
		searchGenerationRef.current++;
		setIsSearching(false);
	}

	const systemDesignForm = useForm({
		defaultValues: DEFAULT_SYSTEM_DESIGN_VALUES,
		validators: {
			onSubmit: ({ value }) => {
				const fields: Record<string, string> = {};

				if (!value.title.trim()) {
					fields.title = "Title is required.";
				}

				value.resources.forEach((resource, index) => {
					const url = resource.url.trim();
					const title = resource.title.trim();

					if (!url && !title) {
						return;
					}

					if (!url) {
						fields[`resources[${index}].url`] = "URL is required.";
						return;
					}

					try {
						new URL(url);
					} catch {
						fields[`resources[${index}].url`] = "Enter a valid URL.";
					}
				});

				if (Object.keys(fields).length === 0) {
					return null;
				}

				return { fields };
			},
		},
		onSubmit: async ({ value }) => {
			setSystemDesignError(null);

			const resources = value.resources
				.map((resource) => ({
					url: resource.url.trim(),
					title: resource.title.trim(),
				}))
				.filter((resource) => resource.url || resource.title)
				.map((resource) => ({
					url: resource.url,
					title: resource.title || undefined,
				}));

			try {
				await addSystemDesignMutation.mutateAsync({
					data: {
						title: value.title.trim(),
						difficulty: value.difficulty,
						tags: value.tags
							.split(",")
							.map((tag) => tag.trim())
							.filter(Boolean),
						resources,
					},
				});
			} catch (error) {
				setSystemDesignError(
					error instanceof Error
						? error.message
						: "Could not add system design problem.",
				);
			}
		},
	});

	const addLeetCodeMutation = useMutation({
		mutationFn: (slug: string) =>
			addProblemFromUrl({
				data: { url: `https://leetcode.com/problems/${slug}/` },
			}),
		onSuccess: async () => {
			setSearchQuery("");
			setResults([]);
			await onAdded();
			await onSuccess?.();
		},
	});

	const addSystemDesignMutation = useMutation({
		mutationFn: addSystemDesignProblem,
		onSuccess: async () => {
			systemDesignForm.reset(DEFAULT_SYSTEM_DESIGN_VALUES);
			setSystemDesignError(null);
			await onAdded();
			await onSuccess?.();
		},
	});

	const leetCodeError =
		searchError ??
		(addLeetCodeMutation.isError
			? addLeetCodeMutation.error instanceof Error
				? addLeetCodeMutation.error.message
				: "Could not add problem."
			: null);

	const hasLeetCodeResults = results.length > 0;
	const showNoResults =
		activeTab === "leetcode" &&
		searchQuery.trim().length >= 2 &&
		!isSearching &&
		!hasLeetCodeResults &&
		!searchError;

	const resourceCount = systemDesignForm.state.values.resources.length;
	const layoutTransition = shouldReduceMotion
		? { duration: 0 }
		: { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.8 };
	const contentTransition = shouldReduceMotion
		? { duration: 0 }
		: { duration: 0.18, ease: EASE_OUT };

	return (
		<Tabs value={activeTab} onValueChange={handleTabChange} className="gap-4">
			<TabsList className="!grid !h-auto w-full grid-cols-2 gap-2 !bg-transparent !p-0">
				{TAB_OPTIONS.map((option) => (
					<TabButton
						key={option.value}
						option={option}
						activeTab={activeTab}
						shouldReduceMotion={shouldReduceMotion}
					/>
				))}
			</TabsList>

			<motion.div
				layout
				transition={layoutTransition}
				className="overflow-hidden border border-white/10 bg-[#0c0f14]"
			>
				<AnimatePresence initial={false} mode="wait">
					{activeTab === "leetcode" ? (
						<motion.div
							key="leetcode"
							layout
							initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
							transition={contentTransition}
							className="space-y-4 p-4 sm:p-5"
						>
							<div className="relative">
								<Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-white/35" />
								<Input
									type="text"
									autoFocus={searchAutoFocus}
									value={searchQuery}
									onChange={(event) => handleSearchChange(event.target.value)}
									placeholder="Search LeetCode"
									className={cn(FIELD_CLASS_NAME, "rounded-none pl-9")}
								/>
							</div>

							<div className="no-scrollbar max-h-[18rem] space-y-2 overflow-y-auto pr-1">
								{isSearching ? (
									<div className="flex items-center gap-2 border border-white/10 px-3 py-2 text-sm text-white/55">
										<Spinner className="size-3.5" />
										<span>Searching…</span>
									</div>
								) : null}

								{showNoResults ? (
									<p className="border border-white/10 px-3 py-3 text-sm text-white/55">
										No problems found.
									</p>
								) : null}

								{leetCodeError ? (
									<p className="border border-red-500/20 bg-red-500/8 px-3 py-3 text-sm text-red-200">
										{leetCodeError}
									</p>
								) : null}

								{hasLeetCodeResults ? (
									<motion.ul
										layout
										className="space-y-2"
										transition={contentTransition}
									>
										{results.map((result) => (
											<ResultItem
												key={result.slug}
												result={result}
												isPending={addLeetCodeMutation.isPending}
												pendingSlug={addLeetCodeMutation.variables}
												onAdd={addLeetCodeMutation.mutate}
											/>
										))}
									</motion.ul>
								) : null}
							</div>
						</motion.div>
					) : (
						<motion.form
							key="system-design"
							layout
							initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							exit={shouldReduceMotion ? undefined : { opacity: 0, y: -6 }}
							transition={contentTransition}
							className="space-y-4 p-4 sm:p-5"
							onSubmit={(event) => {
								event.preventDefault();
								event.stopPropagation();
								void systemDesignForm.handleSubmit();
							}}
						>
							<systemDesignForm.Field name="title">
								{(field) => (
									<div className="space-y-2">
										<label
											htmlFor={field.name}
											className="text-[11px] uppercase tracking-[0.18em] text-white/48"
										>
											Prompt
										</label>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => field.handleChange(event.target.value)}
											placeholder="Design a rate limiter"
											className={cn(FIELD_CLASS_NAME, "rounded-none")}
										/>
										{field.state.meta.errors[0] != null ? (
											<p className="text-sm text-red-200">
												{String(field.state.meta.errors[0])}
											</p>
										) : null}
									</div>
								)}
							</systemDesignForm.Field>

							<div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
								<systemDesignForm.Field name="difficulty">
									{(field) => (
										<div className="space-y-2">
											<label
												htmlFor={`${field.name}-trigger`}
												className="text-[11px] uppercase tracking-[0.18em] text-white/48"
											>
												Difficulty
											</label>
											<Select
												value={field.state.value}
												onValueChange={(value) =>
													field.handleChange(
														value as SystemDesignFormValues["difficulty"],
													)
												}
											>
												<SelectTrigger
													id={`${field.name}-trigger`}
													className={cn(FIELD_CLASS_NAME, "w-full rounded-none")}
												>
													<SelectValue />
												</SelectTrigger>
												<SelectContent className="rounded-none border-white/10 bg-[#0d1118] text-[#f4f5f8]">
													<SelectItem value="Easy">Easy</SelectItem>
													<SelectItem value="Medium">Medium</SelectItem>
													<SelectItem value="Hard">Hard</SelectItem>
												</SelectContent>
											</Select>
										</div>
									)}
								</systemDesignForm.Field>

								<systemDesignForm.Field name="tags">
									{(field) => (
										<div className="space-y-2">
											<label
												htmlFor={field.name}
												className="text-[11px] uppercase tracking-[0.18em] text-white/48"
											>
												Tags
											</label>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => field.handleChange(event.target.value)}
												placeholder="api design, caching"
												className={cn(FIELD_CLASS_NAME, "rounded-none")}
											/>
										</div>
									)}
								</systemDesignForm.Field>
							</div>

							<systemDesignForm.Field name="resources" mode="array">
								{(field) => (
									<div className="space-y-3 border border-white/10 p-3 sm:p-4">
										<div className="flex items-center justify-between gap-3">
											<p className="text-[11px] uppercase tracking-[0.18em] text-white/48">
												Links
											</p>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => field.pushValue({ url: "", title: "" })}
												className="rounded-none border-white/15 bg-transparent text-[#f4f5f8] hover:bg-white/[0.06]"
											>
												<Plus className="size-3.5" />
												Add
											</Button>
										</div>

										<div className="space-y-3">
											{field.state.value.map((_, index) => (
												<div
													key={`${index}-${resourceCount}`}
													className="space-y-3 border border-white/10 p-3"
												>
													<div className="flex items-center justify-between gap-3">
														<span className="text-xs text-white/45">
															Link {index + 1}
														</span>
														<Button
															type="button"
															size="icon-xs"
															variant="ghost"
															onClick={() => field.removeValue(index)}
															className="rounded-none text-white/58 hover:bg-white/[0.06] hover:text-white"
														>
															<X className="size-3.5" />
														</Button>
													</div>

													<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
														<systemDesignForm.Field
															name={`resources[${index}].url` as const}
														>
															{(subField) => (
																<div className="space-y-2">
																	<label
																		htmlFor={subField.name}
																		className="text-[11px] uppercase tracking-[0.18em] text-white/48"
																	>
																		URL
																	</label>
																	<Input
																		id={subField.name}
																		name={subField.name}
																		value={subField.state.value}
																		onBlur={subField.handleBlur}
																		onChange={(event) =>
																			subField.handleChange(event.target.value)
																		}
																		placeholder="https://..."
																		className={cn(FIELD_CLASS_NAME, "rounded-none")}
																	/>
																	{subField.state.meta.errors[0] != null ? (
																		<p className="text-sm text-red-200">
																			{String(subField.state.meta.errors[0])}
																		</p>
																	) : null}
																</div>
															)}
														</systemDesignForm.Field>

														<systemDesignForm.Field
															name={`resources[${index}].title` as const}
														>
															{(subField) => (
																<div className="space-y-2">
																	<label
																		htmlFor={subField.name}
																		className="text-[11px] uppercase tracking-[0.18em] text-white/48"
																	>
																		Title
																	</label>
																	<Input
																		id={subField.name}
																		name={subField.name}
																		value={subField.state.value}
																		onBlur={subField.handleBlur}
																		onChange={(event) =>
																			subField.handleChange(event.target.value)
																		}
																		placeholder="Optional"
																		className={cn(FIELD_CLASS_NAME, "rounded-none")}
																	/>
																</div>
															)}
														</systemDesignForm.Field>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</systemDesignForm.Field>

							{systemDesignError ? (
								<p className="border border-red-500/20 bg-red-500/8 px-3 py-3 text-sm text-red-200">
									{systemDesignError}
								</p>
							) : null}

							<div className="flex justify-end">
								<Button
									type="submit"
									disabled={addSystemDesignMutation.isPending}
									className="rounded-none bg-[#f4f5f8] text-[#0b0e14] hover:bg-white"
								>
									{addSystemDesignMutation.isPending ? (
										<>
											<Spinner className="size-3.5" />
											Saving...
										</>
									) : (
										"Create"
									)}
								</Button>
							</div>
						</motion.form>
					)}
				</AnimatePresence>
			</motion.div>
		</Tabs>
	);
}
