import type { CompetitionDetail } from "@workspace/api-client-react";
import {
  getListActivitiesQueryKey,
  useListActivities,
} from "@workspace/api-client-react";

export function useCompetitionActivityProgress(competition: CompetitionDetail): string | undefined {
  const { data: activities } = useListActivities({
    query: {
      queryKey: getListActivitiesQueryKey(),
      refetchInterval: competition.status === "running" ? 2000 : false,
    },
  });

  const currentActivity = activities?.find(
    (activity) =>
      activity.type === "competition_run" &&
      activity.status === "running" &&
      activity.resultId === competition.id,
  );

  return (
    currentActivity?.progress ??
    activities?.find(
      (activity) => activity.type === "competition_run" && activity.status === "running",
    )?.progress
  );
}