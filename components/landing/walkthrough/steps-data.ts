import { FilesIcon, TagsIcon, ExpiryIcon, FilterIcon, type IconComponent } from "@/components/icons";

export type StepId = "pick" | "tag" | "expiry" | "filter";

export interface WalkthroughStep {
  id: StepId;
  icon: IconComponent;
}

/** Order mirrors the real product flow — grounded in app/(dashboard)/dashboard/google-drive/page.tsx */
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  { id: "pick", icon: FilesIcon },
  { id: "tag", icon: TagsIcon },
  { id: "expiry", icon: ExpiryIcon },
  { id: "filter", icon: FilterIcon },
];
