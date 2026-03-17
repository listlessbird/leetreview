import { Plus } from "lucide-react";
import { useState } from "react";
import { AddProblemTabs } from "@/components/problems/AddProblemTabs";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";

interface AddProblemDialogProps {
	onAdded: () => void | Promise<void>;
}

export function AddProblemDialog({ onAdded }: AddProblemDialogProps) {
	const [open, setOpen] = useState(false);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex items-center gap-2 rounded-none border border-white/15 bg-transparent px-3.5 py-2 text-sm text-[#ededf5] transition-colors duration-150 ease hover:bg-white/[0.06]"
			>
				<Plus className="size-3.5 text-white/65" />
				<span>Add problem</span>
			</button>

			{open ? (
				<DialogContent
					showCloseButton={false}
					className="overflow-hidden rounded-none border-white/10 bg-[#0b0e14] p-0 text-[#ededf5] shadow-[0_24px_60px_rgba(0,0,0,0.45)] sm:max-w-[44rem]"
				>
					<div className="px-5 py-5 sm:px-6 sm:py-6">
						<DialogHeader className="flex-row items-center justify-between gap-4 border-b border-white/8 pb-4">
							<div>
								<DialogTitle className="text-base font-semibold tracking-[0.08em] uppercase text-[#f4f5f8]">
									Add Problem
								</DialogTitle>
								<DialogDescription className="sr-only">
									Add a LeetCode or system design problem.
								</DialogDescription>
							</div>

							<DialogClose asChild>
								<button
									type="button"
									className="rounded-none border border-white/15 px-2.5 py-1.5 text-xs uppercase tracking-[0.18em] text-white/62 transition-colors duration-150 ease hover:bg-white/[0.06] hover:text-white"
								>
									Close
								</button>
							</DialogClose>
						</DialogHeader>

						<div className="pt-4">
							<AddProblemTabs
								searchAutoFocus
								onAdded={onAdded}
								onSuccess={() => setOpen(false)}
							/>
						</div>
					</div>
				</DialogContent>
			) : null}
		</Dialog>
	);
}
