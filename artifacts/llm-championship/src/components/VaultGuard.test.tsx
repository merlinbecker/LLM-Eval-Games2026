import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { VaultGuard } from "@/components/VaultGuard";

// Mock the vault store so tests control the vault status
vi.mock("@/lib/vault/vault-store", () => ({
  useVault: vi.fn(),
}));

import { useVault } from "@/lib/vault/vault-store";
const mockUseVault = vi.mocked(useVault);

function buildVaultMock(
  overrides: Partial<ReturnType<typeof useVault>>
): ReturnType<typeof useVault> {
  return {
    status: "no-vault",
    vault: null,
    error: null,
    synced: false,
    createVault: vi.fn(),
    unlock: vi.fn(),
    lock: vi.fn(),
    importVault: vi.fn(),
    exportVault: vi.fn(),
    addGateway: vi.fn(),
    removeGateway: vi.fn(),
    addDataset: vi.fn(),
    updateDataset: vi.fn(),
    removeDataset: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseVault.mockReturnValue(buildVaultMock({}));
});

describe("VaultGuard", () => {
  describe("status: no-vault (WelcomeForm)", () => {
    it("zeigt die Auswahl Create Vault / Import Vault", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "no-vault" }));

      render(<VaultGuard><div>child</div></VaultGuard>);

      expect(screen.getByText("Create Vault")).toBeInTheDocument();
      expect(screen.getByText("Import Vault")).toBeInTheDocument();
    });

    it("rendert KEINE Kinder wenn kein Vault vorhanden", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "no-vault" }));

      render(<VaultGuard><div>geheiminhalt</div></VaultGuard>);

      expect(screen.queryByText("geheiminhalt")).not.toBeInTheDocument();
    });

    it("wechselt zum Create-Formular nach Klick auf Create Vault", async () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "no-vault" }));
      const user = userEvent.setup();

      render(<VaultGuard><div>child</div></VaultGuard>);

      await user.click(screen.getByText("Create Vault"));

      expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("Confirm password")).toBeInTheDocument();
    });

    it("zeigt Passwort-Mismatch-Warnung wenn Passwörter nicht übereinstimmen", async () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "no-vault" }));
      const user = userEvent.setup();

      render(<VaultGuard><div>child</div></VaultGuard>);

      await user.click(screen.getByText("Create Vault"));
      await user.type(screen.getByPlaceholderText("Password"), "abc123");
      await user.type(screen.getByPlaceholderText("Confirm password"), "xyz999");

      expect(screen.getByText("Passwords do not match.")).toBeInTheDocument();
    });

    it("ruft createVault mit dem Passwort auf wenn Formular abgeschickt wird", async () => {
      const createVault = vi.fn().mockResolvedValue(undefined);
      mockUseVault.mockReturnValue(buildVaultMock({ status: "no-vault", createVault }));
      const user = userEvent.setup();

      render(<VaultGuard><div>child</div></VaultGuard>);

      await user.click(screen.getByText("Create Vault"));
      await user.type(screen.getByPlaceholderText("Password"), "sicher123");
      await user.type(screen.getByPlaceholderText("Confirm password"), "sicher123");
      await user.click(screen.getByRole("button", { name: "Create" }));

      expect(createVault).toHaveBeenCalledWith("sicher123");
    });
  });

  describe("status: locked (UnlockForm)", () => {
    it("zeigt das Unlock-Formular mit Passwort-Eingabe", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "locked" }));

      render(<VaultGuard><div>child</div></VaultGuard>);

      expect(screen.getByPlaceholderText("Vault password")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Unlock Vault" })).toBeInTheDocument();
    });

    it("rendert KEINE Kinder wenn Vault gesperrt ist", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "locked" }));

      render(<VaultGuard><div>geheiminhalt</div></VaultGuard>);

      expect(screen.queryByText("geheiminhalt")).not.toBeInTheDocument();
    });

    it("zeigt Fehlermeldung wenn error gesetzt ist", () => {
      mockUseVault.mockReturnValue(
        buildVaultMock({ status: "locked", error: "Falsches Passwort" })
      );

      render(<VaultGuard><div>child</div></VaultGuard>);

      expect(screen.getByText("Falsches Passwort")).toBeInTheDocument();
    });

    it("ruft unlock mit dem eingegebenen Passwort auf", async () => {
      const unlock = vi.fn().mockResolvedValue(undefined);
      mockUseVault.mockReturnValue(buildVaultMock({ status: "locked", unlock }));
      const user = userEvent.setup();

      render(<VaultGuard><div>child</div></VaultGuard>);

      await user.type(screen.getByPlaceholderText("Vault password"), "meinpasswort");
      await user.click(screen.getByRole("button", { name: "Unlock Vault" }));

      expect(unlock).toHaveBeenCalledWith("meinpasswort");
    });

    it("deaktiviert den Unlock-Button wenn kein Passwort eingegeben wurde", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "locked" }));

      render(<VaultGuard><div>child</div></VaultGuard>);

      expect(screen.getByRole("button", { name: "Unlock Vault" })).toBeDisabled();
    });
  });

  describe("status: unlocked", () => {
    it("rendert Kinder direkt wenn Vault entsperrt ist", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "unlocked" }));

      render(<VaultGuard><div>geschützter inhalt</div></VaultGuard>);

      expect(screen.getByText("geschützter inhalt")).toBeInTheDocument();
    });

    it("zeigt kein Formular wenn Vault entsperrt ist", () => {
      mockUseVault.mockReturnValue(buildVaultMock({ status: "unlocked" }));

      render(<VaultGuard><div>child</div></VaultGuard>);

      expect(screen.queryByPlaceholderText("Vault password")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Vault")).not.toBeInTheDocument();
    });
  });
});
