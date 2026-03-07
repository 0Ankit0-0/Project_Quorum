import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Database, Download, HardDrive, KeyRound, RefreshCw, Shield } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import {
  downloadExportedSystemLog,
  exportSystemLog,
  getEncryptionConfig,
  getStorageStatus,
  updateEncryptionConfig,
  updateStorageQuota,
  type EncryptionConfig,
  type StorageStatus,
} from "@/lib/api-functions";
import { toast } from "sonner";

const fallbackStorage: StorageStatus = {
  quota_bytes: 0,
  used_bytes: 0,
  usage_by_category: {},
  utilization_percent: 0,
  alert_level: "normal",
  cleanup_suggestions: [],
};

const fallbackEncryption: EncryptionConfig = {
  signature_algorithm: "RSA-PSS-4096",
  hash_algorithm: "SHA-256",
  key_rotation_days: 90,
};

const toGb = (bytes: number) => bytes / (1024 * 1024 * 1024);

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35 },
});

export default function Settings() {
  const [storage, setStorage] = useState<StorageStatus>(fallbackStorage);
  const [encryption, setEncryption] = useState<EncryptionConfig>(fallbackEncryption);
  const [quotaGbInput, setQuotaGbInput] = useState("4");
  const [passphrase, setPassphrase] = useState("");
  const [encryptExport, setEncryptExport] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, e] = await Promise.all([getStorageStatus(), getEncryptionConfig()]);
      setStorage(s);
      setEncryption(e);
      setQuotaGbInput(String(toGb(s.quota_bytes).toFixed(2)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const alertColor = useMemo(() => {
    if (storage.alert_level === "critical") return "hsl(var(--critical))";
    if (storage.alert_level === "warning") return "hsl(var(--high))";
    return "hsl(var(--low))";
  }, [storage.alert_level]);

  const alertBg = useMemo(() => {
    if (storage.alert_level === "critical") return "hsl(var(--critical) / 0.12)";
    if (storage.alert_level === "warning") return "hsl(var(--high) / 0.12)";
    return "hsl(var(--low) / 0.12)";
  }, [storage.alert_level]);

  const saveQuota = async () => {
    const next = Number(quotaGbInput);
    if (!Number.isFinite(next) || next <= 0) {
      toast.error("Invalid quota value");
      return;
    }
    setBusy(true);
    try {
      const data = await updateStorageQuota(next);
      setStorage(data);
      toast.success("Storage quota updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update quota");
    } finally {
      setBusy(false);
    }
  };

  const saveEncryption = async () => {
    setBusy(true);
    try {
      const data = await updateEncryptionConfig(encryption);
      setEncryption(data);
      toast.success("Encryption settings updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update encryption settings");
    } finally {
      setBusy(false);
    }
  };

  const exportLogs = async () => {
    if (!passphrase.trim()) {
      toast.error("Passphrase required");
      return;
    }
    setBusy(true);
    try {
      const result = await exportSystemLog(passphrase.trim(), encryptExport);
      const blob = await downloadExportedSystemLog(result.filename);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Export downloaded (${result.sha256.slice(0, 12)}...)`);
    } catch (error) {
      console.error(error);
      toast.error("Log export failed (check passphrase)");
    } finally {
      setBusy(false);
    }
  };

  const usedGb = toGb(storage.used_bytes);
  const quotaGb = toGb(storage.quota_bytes);

  return (
    <AppLayout title="Settings" subtitle="Storage, encryption, and secure system log export">
      <div className="flex flex-col gap-6 h-full">

        {/* ── Row 1: Storage + Encryption ─────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Storage Allocation */}
          <motion.div
            {...fadeUp(0)}
            className="cyber-card p-6 flex flex-col gap-5"
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
                >
                  <Database className="w-4 h-4 text-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Storage Allocation</h3>
                  <p className="text-xs text-muted-foreground font-mono">Manage on-device data quota</p>
                </div>
              </div>
              <button
                onClick={() => void load()}
                disabled={loading}
                className="w-7 h-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ background: "hsl(var(--muted) / 0.5)" }}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            {/* Utilization summary bar */}
            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: alertBg, border: `1px solid ${alertColor}33` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wide">Disk Usage</span>
                <span className="text-sm font-bold font-mono" style={{ color: alertColor }}>
                  {storage.utilization_percent}%
                  <span
                    className="ml-1.5 text-xs font-normal px-1.5 py-0.5 rounded"
                    style={{ background: alertBg, color: alertColor, border: `1px solid ${alertColor}44` }}
                  >
                    {storage.alert_level.toUpperCase()}
                  </span>
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: alertColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(storage.utilization_percent, 100)}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>{usedGb.toFixed(3)} GB used</span>
                <span>{quotaGb.toFixed(2)} GB quota</span>
              </div>
            </div>

            {/* Quota input */}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <HardDrive className="w-3 h-3" />
                Max Quota (GB)
              </label>
              <div className="flex gap-2">
                <input
                  value={quotaGbInput}
                  onChange={(e) => setQuotaGbInput(e.target.value)}
                  className="flex-1 bg-muted border border-border rounded-md px-3 py-2 text-sm text-foreground font-mono outline-none focus:border-cyan/50 transition-colors"
                />
                <button
                  onClick={() => void saveQuota()}
                  disabled={busy}
                  className="px-4 py-2 rounded-md text-xs font-semibold border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Category breakdown */}
            {Object.keys(storage.usage_by_category).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Usage by Category</p>
                <div className="space-y-1 rounded-md border border-border bg-muted/30 p-3">
                  {Object.entries(storage.usage_by_category).map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-xs font-mono">
                      <span className="text-muted-foreground capitalize">{k}</span>
                      <span className="text-foreground">{toGb(v).toFixed(3)} GB</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cleanup suggestions */}
            {storage.cleanup_suggestions.length > 0 && (
              <div className="space-y-1">
                {storage.cleanup_suggestions.map((s, idx) => (
                  <p key={`${s}-${idx}`} className="text-xs font-mono text-high">
                    ⚠ {s}
                  </p>
                ))}
              </div>
            )}
          </motion.div>

          {/* Encryption Configuration */}
          <motion.div
            {...fadeUp(0.08)}
            className="cyber-card p-6 flex flex-col gap-5"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
              >
                <Shield className="w-4 h-4 text-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Encryption Configuration</h3>
                <p className="text-xs text-muted-foreground font-mono">Signature, hashing, and key rotation</p>
              </div>
            </div>

            {/* Status badge */}
            <div
              className="rounded-lg p-3 flex items-center justify-between"
              style={{
                background: "hsl(var(--low) / 0.08)",
                border: "1px solid hsl(var(--low) / 0.25)",
              }}
            >
              <span className="text-xs text-muted-foreground font-mono">Current Profile</span>
              <span className="text-xs font-bold font-mono text-low">
                {encryption.signature_algorithm} / {encryption.hash_algorithm}
              </span>
            </div>

            {/* Fields */}
            <div className="space-y-4 flex-1">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                  Signature Algorithm
                </label>
                <select
                  value={encryption.signature_algorithm}
                  onChange={(e) => setEncryption((prev) => ({ ...prev, signature_algorithm: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-cyan/50 transition-colors"
                >
                  <option value="RSA-PSS-4096">RSA-PSS 4096-bit</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                  Hashing Mode
                </label>
                <select
                  value={encryption.hash_algorithm}
                  onChange={(e) => setEncryption((prev) => ({ ...prev, hash_algorithm: e.target.value }))}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-cyan/50 transition-colors"
                >
                  <option value="SHA-256">SHA-256</option>
                  <option value="SHA-512">SHA-512</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                  Key Rotation Interval (days)
                </label>
                <input
                  type="number"
                  value={encryption.key_rotation_days}
                  onChange={(e) =>
                    setEncryption((prev) => ({
                      ...prev,
                      key_rotation_days: Number(e.target.value || 90),
                    }))
                  }
                  className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-cyan/50 transition-colors"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Next rotation in ~{encryption.key_rotation_days} days
                </p>
              </div>
            </div>

            <button
              onClick={() => void saveEncryption()}
              disabled={busy}
              className="w-full py-2.5 rounded-md text-xs font-semibold border border-cyan/40 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
            >
              Save Encryption Settings
            </button>
          </motion.div>
        </div>

        {/* ── Row 2: System Log Export (full width) ───────────────────── */}
        <motion.div
          {...fadeUp(0.16)}
          className="cyber-card p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
            >
              <KeyRound className="w-4 h-4 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">System Log Download</h3>
              <p className="text-xs text-muted-foreground font-mono">
                Authenticate and export an encrypted or plain archive of system logs
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-end">
            <div className="xl:col-span-2 space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                Authentication Passphrase
              </label>
              <input
                type="password"
                placeholder="Enter passphrase to authenticate export…"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-cyan/50 transition-colors"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                Export Options
              </label>
              <label
                className="flex items-center gap-3 h-[42px] px-3 rounded-md border border-border cursor-pointer select-none text-sm"
                style={{ background: "hsl(var(--muted) / 0.5)" }}
              >
                <input
                  type="checkbox"
                  checked={encryptExport}
                  onChange={(e) => setEncryptExport(e.target.checked)}
                  className="accent-cyan w-4 h-4"
                />
                <span className="text-foreground font-mono text-xs">Encrypt output (.enc)</span>
              </label>
            </div>

            <button
              onClick={() => void exportLogs()}
              disabled={busy}
              className="h-[42px] px-5 rounded-md text-xs font-semibold flex items-center justify-center gap-2 border border-cyan/50 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
              style={{ boxShadow: "0 0 12px hsl(var(--cyan) / 0.15)" }}
            >
              <Download className="w-4 h-4" />
              Export quorum.log
            </button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground font-mono">
            ⚠ The exported archive includes a SHA-256 checksum for integrity verification. Store securely.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
