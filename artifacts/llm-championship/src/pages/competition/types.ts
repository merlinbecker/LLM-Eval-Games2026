import type { CompetitionResult, CompetitionDetail } from "@workspace/api-client-react";

export type CeremonyTab = "overview" | "winners" | "details";

export interface TabConfig {
  id: CeremonyTab;
  label: string;
  icon: React.ReactNode;
}

export interface SortedResultsProps {
  comp: CompetitionDetail;
  sortedResults: CompetitionResult[];
}
