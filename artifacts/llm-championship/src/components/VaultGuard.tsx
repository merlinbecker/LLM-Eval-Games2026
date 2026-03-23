import { useState, useRef, type FormEvent, type ReactNode } from "react";
import { useVault } from "@/lib/vault/vault-store";
import { RetroWindow, RetroButton, RetroInput, RetroError } from "@/components/retro";

export function VaultGuard({ children }: { children: ReactNode }) {
  const { status, error, createVault, unlock, importVault } = useVault();

  if (status === "unlocked") return <>{children}</>;

  if (status === "locked") return <UnlockForm onUnlock={unlock} error={error} />;

  return (
    <WelcomeForm
      onCreate={createVault}
      onImport={importVault}
      error={error}
    />
  );
}

function UnlockForm({
  onUnlock,
  error,
}: {
  onUnlock: (password: string) => Promise<void>;
  error: string | null;
}) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onUnlock(password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RetroWindow title="Vault Unlock" className="w-full max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="font-sans text-sm">
            Your vault is locked. Enter your password to unlock.
          </p>
          <RetroInput
            type="password"
            placeholder="Vault password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <RetroError>{error}</RetroError>}
          <RetroButton type="submit" disabled={!password || loading} className="w-full">
            {loading ? "Unlocking..." : "Unlock Vault"}
          </RetroButton>
        </form>
      </RetroWindow>
    </div>
  );
}

function WelcomeForm({
  onCreate,
  onImport,
  error,
}: {
  onCreate: (password: string) => Promise<void>;
  onImport: (file: File, password: string) => Promise<void>;
  error: string | null;
}) {
  const [mode, setMode] = useState<"choose" | "create" | "import">("choose");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return;
    setLoading(true);
    try {
      await onCreate(password);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    try {
      await onImport(file, password);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <RetroWindow title="LLM Championship — Vault Setup" className="w-full max-w-lg">
        {mode === "choose" && (
          <div className="space-y-4 text-center">
            <p className="font-sans text-sm">
              Your data is stored locally in an encrypted vault.
              <br />
              Create a new vault or import an existing one.
            </p>
            <div className="flex gap-4 justify-center">
              <RetroButton onClick={() => setMode("create")}>
                Create Vault
              </RetroButton>
              <RetroButton variant="secondary" onClick={() => setMode("import")}>
                Import Vault
              </RetroButton>
            </div>
          </div>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="font-sans text-sm">
              Choose a password to encrypt your vault.
            </p>
            <RetroInput
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
            />
            <RetroInput
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            {password && confirm && password !== confirm && (
              <RetroError>Passwords do not match.</RetroError>
            )}
            {error && <RetroError>{error}</RetroError>}
            <div className="flex gap-4">
              <RetroButton
                type="submit"
                disabled={!password || password !== confirm || loading}
                className="flex-1"
              >
                {loading ? "Creating..." : "Create"}
              </RetroButton>
              <RetroButton
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                Back
              </RetroButton>
            </div>
          </form>
        )}

        {mode === "import" && (
          <form onSubmit={handleImport} className="space-y-4">
            <p className="font-sans text-sm">
              Select a <code>.vault</code> file and enter its password.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".vault,.json"
              className="w-full font-sans text-sm"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <RetroInput
              type="password"
              placeholder="Vault password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <RetroError>{error}</RetroError>}
            <div className="flex gap-4">
              <RetroButton
                type="submit"
                disabled={!file || !password || loading}
                className="flex-1"
              >
                {loading ? "Importing..." : "Import"}
              </RetroButton>
              <RetroButton
                type="button"
                variant="secondary"
                onClick={() => setMode("choose")}
              >
                Back
              </RetroButton>
            </div>
          </form>
        )}
      </RetroWindow>
    </div>
  );
}
