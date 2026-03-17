import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { AddProblemTabs } from "@/components/problems/AddProblemTabs";

export const Route = createFileRoute("/_protected/add")({
	component: AddProblemPage,
});

const NOOP = () => {};

function AddProblemPage() {
	const navigate = useNavigate();
	const handleSuccess = useCallback(
		() => navigate({ to: "/dashboard" }),
		[navigate],
	);

	return (
		<div className="min-h-screen bg-[#07070e] p-8 font-berkeley text-[#ededf5]">
			<div className="mx-auto w-full max-w-3xl rounded border border-white/10 bg-white/5 p-6">
				<h1 className="mb-2 text-2xl font-bold tracking-tight">
					Add Interview Problem
				</h1>
				<p className="mb-6 text-sm text-white/65">
					Search LeetCode or add a system design problem
				</p>

				<AddProblemTabs
					searchAutoFocus
					onAdded={NOOP}
					onSuccess={handleSuccess}
				/>
			</div>
		</div>
	);
}
