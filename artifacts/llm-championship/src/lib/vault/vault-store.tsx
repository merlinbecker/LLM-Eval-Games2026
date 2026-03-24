import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { VaultData, VaultGateway, VaultDataset, VaultConfiguredModel, StoredVault } from "./types";
import { encrypt, decrypt } from "./crypto";
import { syncToServer, deleteSession } from "./vault-sync";

const STORAGE_KEY = "llm-championship-vault";
const SAVE_DEBOUNCE_MS = 2_000;

type VaultStatus = "no-vault" | "locked" | "unlocked";

interface VaultContextValue {
  status: VaultStatus;
  vault: VaultData | null;
  error: string | null;
  synced: boolean;

  createVault: (password: string) => Promise<void>;
  unlock: (password: string) => Promise<void>;
  lock: () => Promise<void>;
  importVault: (file: File, password: string) => Promise<void>;
  exportVault: () => void;

  addGateway: (gw: VaultGateway) => void;
  removeGateway: (id: number) => void;
  addDataset: (ds: VaultDataset) => void;
  updateDataset: (ds: VaultDataset) => void;
  removeDataset: (id: number) => void;
  addConfiguredModel: (cm: VaultConfiguredModel) => void;
  removeConfiguredModel: (id: number) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}

function emptyVault(): VaultData {
  const now = new Date().toISOString();
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    gateways: [],
    datasets: [],
    configuredModels: [],
    settings: {},
  };
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<VaultStatus>(() => {
    return localStorage.getItem(STORAGE_KEY) ? "locked" : "no-vault";
  });
  const [vault, setVault] = useState<VaultData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);
  const passwordRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- persist helpers ----------

  const persistVault = useCallback(
    async (data: VaultData) => {
      if (!passwordRef.current) return;
      const json = JSON.stringify(data);
      const { salt, iv, data: encrypted } = await encrypt(json, passwordRef.current);
      const stored: StoredVault = { v: 1, salt, iv, data: encrypted };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    },
    [],
  );

  const scheduleSave = useCallback(
    (data: VaultData) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        persistVault(data);
      }, SAVE_DEBOUNCE_MS);
    },
    [persistVault],
  );

  // ---------- sync to server ----------

  const syncVault = useCallback(async (data: VaultData) => {
    try {
      await syncToServer(data.gateways, data.datasets, data.configuredModels ?? []);
      setSynced(true);
    } catch (err) {
      setSynced(false);
      throw err;
    }
  }, []);

  // ---------- public API ----------

  const createVault = useCallback(
    async (password: string) => {
      const v = emptyVault();
      passwordRef.current = password;
      await persistVault(v);
      setVault(v);
      setStatus("unlocked");
      setError(null);
      await syncVault(v);
    },
    [persistVault, syncVault],
  );

  const unlock = useCallback(
    async (password: string) => {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setError("No vault found.");
        return;
      }
      try {
        const stored: StoredVault = JSON.parse(raw);
        const json = await decrypt(stored.salt, stored.iv, stored.data, password);
        const data: VaultData = JSON.parse(json);
        passwordRef.current = password;
        setVault(data);
        setStatus("unlocked");
        setError(null);
        await syncVault(data);
      } catch {
        setError("Wrong password or corrupted vault.");
      }
    },
    [syncVault],
  );

  const lock = useCallback(async () => {
    if (vault && passwordRef.current) {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await persistVault(vault);
    }
    await deleteSession();
    passwordRef.current = null;
    setVault(null);
    setSynced(false);
    setStatus("locked");
  }, [vault, persistVault]);

  const importVault = useCallback(
    async (file: File, password: string) => {
      const text = await file.text();
      const stored: StoredVault = JSON.parse(text);
      const json = await decrypt(stored.salt, stored.iv, stored.data, password);
      const data: VaultData = JSON.parse(json);
      passwordRef.current = password;
      localStorage.setItem(STORAGE_KEY, text);
      setVault(data);
      setStatus("unlocked");
      setError(null);
      await syncVault(data);
    },
    [syncVault],
  );

  const exportVault = useCallback(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const blob = new Blob([raw], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llm-championship.vault";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // ---------- mutation helpers ----------

  const mutate = useCallback(
    (fn: (data: VaultData) => VaultData) => {
      setVault((prev) => {
        if (!prev) return prev;
        const next = fn({ ...prev, updatedAt: new Date().toISOString() });
        scheduleSave(next);
        // fire-and-forget server sync
        syncToServer(next.gateways, next.datasets, next.configuredModels ?? []).then(() => setSynced(true)).catch(() => setSynced(false));
        return next;
      });
    },
    [scheduleSave],
  );

  const addGateway = useCallback(
    (gw: VaultGateway) => mutate((v) => ({ ...v, gateways: [...v.gateways, gw] })),
    [mutate],
  );

  const removeGateway = useCallback(
    (id: number) => mutate((v) => ({ ...v, gateways: v.gateways.filter((g) => g.id !== id) })),
    [mutate],
  );

  const addDataset = useCallback(
    (ds: VaultDataset) => mutate((v) => ({ ...v, datasets: [...v.datasets, ds] })),
    [mutate],
  );

  const updateDataset = useCallback(
    (ds: VaultDataset) =>
      mutate((v) => ({
        ...v,
        datasets: v.datasets.map((d) => (d.id === ds.id ? ds : d)),
      })),
    [mutate],
  );

  const removeDataset = useCallback(
    (id: number) => mutate((v) => ({ ...v, datasets: v.datasets.filter((d) => d.id !== id) })),
    [mutate],
  );

  const addConfiguredModel = useCallback(
    (cm: VaultConfiguredModel) => mutate((v) => ({ ...v, configuredModels: [...(v.configuredModels ?? []), cm] })),
    [mutate],
  );

  const removeConfiguredModel = useCallback(
    (id: number) => mutate((v) => ({ ...v, configuredModels: (v.configuredModels ?? []).filter((m) => m.id !== id) })),
    [mutate],
  );

  // ---------- cleanup ----------

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return (
    <VaultContext.Provider
      value={{
        status,
        vault,
        error,
        synced,
        createVault,
        unlock,
        lock,
        importVault,
        exportVault,
        addGateway,
        removeGateway,
        addDataset,
        updateDataset,
        removeDataset,
        addConfiguredModel,
        removeConfiguredModel,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}
