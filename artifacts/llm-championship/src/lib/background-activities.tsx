import { createContext, useContext, useRef, useCallback, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListActivities,
  useAcknowledgeActivity,
  getListActivitiesQueryKey,
  getListDatasetsQueryKey,
  getListCompetitionsQueryKey,
} from "@workspace/api-client-react";
import type { Activity, ActivityType } from "@workspace/api-client-react";
import { toast } from "sonner";

const COMPLETION_CONFIG: Record<ActivityType, { queryKey: () => readonly unknown[]; message: string }> = {
  dataset_generate: { queryKey: getListDatasetsQueryKey, message: "Dataset wurde erfolgreich generiert" },
  competition_run: { queryKey: getListCompetitionsQueryKey, message: "Wettbewerb wurde erfolgreich abgeschlossen" },
};

interface BackgroundActivityContextValue {
  activities: Activity[];
  runningActivities: Activity[];
  runningCount: number;
  unacknowledgedCount: number;
  acknowledge: (id: number) => void;
  acknowledgeAll: () => void;
}

const BackgroundActivityContext = createContext<BackgroundActivityContextValue>({
  activities: [],
  runningActivities: [],
  runningCount: 0,
  unacknowledgedCount: 0,
  acknowledge: () => {},
  acknowledgeAll: () => {},
});

export function useBackgroundActivities() {
  return useContext(BackgroundActivityContext);
}

export function BackgroundActivityProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const ackMutation = useAcknowledgeActivity();
  const prevActivitiesRef = useRef<Map<number, Activity>>(new Map());

  const { data: activities = [] } = useListActivities({
    query: {
      queryKey: getListActivitiesQueryKey(),
      refetchInterval: 3000,
    },
  });

  // Detect completed/errored activities and show toasts
  useEffect(() => {
    const prevMap = prevActivitiesRef.current;
    const newMap = new Map<number, Activity>();

    for (const activity of activities) {
      newMap.set(activity.id, activity);
      const prev = prevMap.get(activity.id);

      if (prev && prev.status === "running" && activity.status !== "running") {
        if (activity.status === "completed") {
          const config = COMPLETION_CONFIG[activity.type];
          toast.success(activity.title, {
            description: config.message,
            duration: 8000,
          });
          queryClient.invalidateQueries({ queryKey: config.queryKey() });
        } else if (activity.status === "error") {
          toast.error(activity.title, {
            description: activity.error || "Ein Fehler ist aufgetreten",
            duration: 10000,
          });
        }
      }
    }

    prevActivitiesRef.current = newMap;
  }, [activities, queryClient]);

  const runningActivities = activities.filter((a) => a.status === "running");
  const runningCount = runningActivities.length;
  const unacknowledgedCount = activities.filter(
    (a) => !a.acknowledged && a.status !== "running"
  ).length;

  const acknowledge = useCallback(
    (id: number) => {
      ackMutation.mutate(
        { id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
          },
        }
      );
    },
    [ackMutation, queryClient]
  );

  const acknowledgeAll = useCallback(() => {
    const unacked = activities.filter((a) => !a.acknowledged && a.status !== "running");
    for (const a of unacked) {
      ackMutation.mutate(
        { id: a.id },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListActivitiesQueryKey() });
          },
        }
      );
    }
  }, [activities, ackMutation, queryClient]);

  return (
    <BackgroundActivityContext.Provider
      value={{
        activities,
        runningActivities,
        runningCount,
        unacknowledgedCount,
        acknowledge,
        acknowledgeAll,
      }}
    >
      {children}
    </BackgroundActivityContext.Provider>
  );
}
