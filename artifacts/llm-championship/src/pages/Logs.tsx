import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListLlmLogs,
  useClearLlmLogs,
  getListLlmLogsQueryKey,
} from "@workspace/api-client-react";
import type { LlmLog } from "@workspace/api-client-react";
import { RetroWindow, RetroButton, RetroBadge } from "@/components/retro";
import { ChevronDown, ChevronRight, Trash2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString("de-DE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function CollapsibleJson({ data, label }: { data: unknown; label: string }) {
  const [open, setOpen] = useState(false);
  const jsonStr = useMemo(() => JSON.stringify(data, null, 2), [data]);

  return (
      <div className="border-2 border-mac-black bg-mac-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 font-display text-xs uppercase hover:bg-pattern-5 transition-colors"
      >
        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        {label}
        <span className="ml-auto text-mac-black font-sans normal-case text-xs">
          {jsonStr.length > 200 ? `${(jsonStr.length / 1024).toFixed(1)} KB` : `${jsonStr.length} chars`}
        </span>
      </button>
      {open && (
        <pre className="px-3 py-2 text-xs font-mono overflow-x-auto border-t-2 border-mac-black bg-pattern-5 max-h-96 overflow-y-auto whitespace-pre-wrap break-words">
          {jsonStr}
        </pre>
      )}
    </div>
  );
}

function LogEntry({ log }: { log: LlmLog }) {
  const [expanded, setExpanded] = useState(false);
  const isError = log.error !== null;

  return (
    <div className={cn("border-2 border-mac-black", isError && "border-dashed")}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pattern-5 transition-colors text-left"
      >
        {expanded ? <ChevronDown className="w-4 h-4 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 flex-shrink-0" />}
        <span className="font-display text-xs uppercase w-20 flex-shrink-0">
          <RetroBadge className={cn(
            "text-[10px]",
            isError ? "bg-mac-black text-mac-white border-dashed" : ""
          )}>
            {log.responseStatus}
          </RetroBadge>
        </span>
        <span className="font-display text-sm uppercase truncate flex-1">{log.modelId}</span>
        <span className="text-xs font-sans text-mac-black flex-shrink-0">{log.gatewayType}</span>
        <span className="font-display text-xs w-20 text-right flex-shrink-0">{log.durationMs}ms</span>
        <span className="text-xs font-sans text-mac-black w-36 text-right flex-shrink-0">
          {formatTimestamp(log.timestamp)}
        </span>
      </button>

      {expanded && (
        <div className="border-t-2 border-mac-black px-4 py-3 space-y-3 bg-mac-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div>
              <span className="font-display uppercase text-mac-black">Gateway</span>
              <p className="font-sans mt-0.5">{log.gatewayType}</p>
            </div>
            <div>
              <span className="font-display uppercase text-mac-black">Model</span>
              <p className="font-sans mt-0.5 break-all">{log.modelId}</p>
            </div>
            <div>
              <span className="font-display uppercase text-mac-black">URL</span>
              <p className="font-sans mt-0.5 break-all">{log.requestUrl}</p>
            </div>
            <div>
              <span className="font-display uppercase text-mac-black">Duration</span>
              <p className="font-sans mt-0.5">{log.durationMs}ms</p>
            </div>
          </div>

          {isError && (
            <div className="border-2 border-dashed border-mac-black bg-mac-white px-3 py-2">
              <span className="font-display text-xs uppercase">Error: </span>
              <span className="font-sans text-sm">{log.error}</span>
            </div>
          )}

          <div className="space-y-2">
            <CollapsibleJson data={log.requestBody} label="Request Body" />
            <CollapsibleJson data={log.responseBody} label="Response Body" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function Logs() {
  const queryClient = useQueryClient();
  const { data: logs, isLoading } = useListLlmLogs({
    query: { refetchInterval: 5000, queryKey: getListLlmLogsQueryKey() },
  });
  const clearMutation = useClearLlmLogs();

  const logList = Array.isArray(logs) ? logs : [];

  const handleClear = async () => {
    if (confirm("Alle Logs löschen?")) {
      await clearMutation.mutateAsync();
      queryClient.invalidateQueries({ queryKey: getListLlmLogsQueryKey() });
    }
  };

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: getListLlmLogsQueryKey() });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <RetroWindow title="LLM CALL LOGS">
        <div className="flex items-center justify-between mb-4">
          <p className="font-sans text-lg">
            {logList.length === 0
              ? "Noch keine LLM Calls geloggt."
              : `${logList.length} Log${logList.length !== 1 ? "s" : ""}`}
          </p>
          <div className="flex gap-2">
            <RetroButton size="sm" variant="secondary" onClick={handleRefresh}>
              <RefreshCw className="w-3 h-3 inline mr-1" />
              Refresh
            </RetroButton>
            {logList.length > 0 && (
              <RetroButton size="sm" variant="danger" onClick={handleClear}>
                <Trash2 className="w-3 h-3 inline mr-1" />
                Clear
              </RetroButton>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center font-display text-2xl animate-pulse">LOADING LOGS...</div>
        ) : logList.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-mac-black">
            <p className="font-display text-xl uppercase mb-2">Keine Logs vorhanden</p>
            <p className="font-sans text-mac-black">
              LLM Calls werden automatisch geloggt, wenn Competitions ausgeführt oder Datasets generiert/geprüft werden.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {logList.map((log) => (
              <LogEntry key={log.id} log={log} />
            ))}
          </div>
        )}
      </RetroWindow>
    </div>
  );
}
