import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, FolderOpen, History, RefreshCw, RotateCcw, Search, ShieldCheck, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "@/components/layout/AppLayout";
import {
  applyUpdatePackage,
  getUpdateHistory,
  rollbackUpdatePackage,
  scanForUpdatePackages,
  verifyUpdatePackage,
  type SoupUpdateHistoryEntry,
  type SoupVerifyResult,
} from "@/lib/api-functions";

type UpdateType = "model" | "rules" | "mitre";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { delay, duration: 0.35 },
});

export default function Updates() {
  const [packagePath, setPackagePath] = useState("");
  const [verifyResult, setVerifyResult] = useState<SoupVerifyResult | null>(null);
  const [history, setHistory] = useState<SoupUpdateHistoryEntry[]>([]);
  const [scanResults, setScanResults] = useState<string[]>([]);
  const [rollbackType, setRollbackType] = useState<UpdateType>("model");
  const [busy, setBusy] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);

  const refreshHistory = async () => {
    setHistoryLoading(true);
    try {
      const data = await getUpdateHistory();
      setHistory(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load update history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void refreshHistory();
  }, []);

  const runVerify = async () => {
    if (!packagePath.trim()) {
      toast.error("Enter a package path");
      return;
    }
    setBusy(true);
    try {
      const result = await verifyUpdatePackage(packagePath.trim());
      setVerifyResult(result);
      if (result.valid) {
        toast.success(`Verified ${result.type ?? "update"} v${result.version ?? "unknown"}`);
      } else {
        toast.error(`Verification failed: ${result.message}`);
      }
    } catch (error) {
      console.error(error);
      toast.error("Package verification failed");
    } finally {
      setBusy(false);
    }
  };

  const browsePackage = async () => {
    try {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Quorum Update Package", extensions: ["qup"] }],
      });
      if (typeof selected === "string" && selected.trim()) {
        setPackagePath(selected);
        return;
      }
    } catch {
      // Fallback for non-Tauri runtime
    }

    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".qup";
    input.onchange = () => {
      const file = input.files?.[0] as (File & { path?: string }) | undefined;
      if (file?.path) {
        setPackagePath(file.path);
      } else {
        toast.error("Browser mode does not expose full file path. Paste path manually.");
      }
    };
    input.click();
  };

  const runApply = async () => {
    if (!packagePath.trim()) {
      toast.error("Enter a package path");
      return;
    }
    setBusy(true);
    try {
      const result = await applyUpdatePackage(packagePath.trim());
      toast.success(result.message || "Update applied");
      await refreshHistory();
    } catch (error) {
      console.error(error);
      toast.error("Failed to apply update");
    } finally {
      setBusy(false);
    }
  };

  const runScan = async () => {
    setBusy(true);
    try {
      const data = await scanForUpdatePackages();
      setScanResults(data.packages ?? []);
      toast.success(`Found ${data.packages_found} package(s)`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to scan for packages");
    } finally {
      setBusy(false);
    }
  };

  const runRollback = async () => {
    setBusy(true);
    try {
      const result = await rollbackUpdatePackage(rollbackType);
      if (result.success) {
        toast.success(result.message || "Rollback complete");
        await refreshHistory();
      } else {
        toast.error(result.message || "Rollback failed");
      }
    } catch (error) {
      console.error(error);
      toast.error("Rollback failed");
    } finally {
      setBusy(false);
    }
  };

  const sortedHistory = [...history].reverse();

  return (
    <AppLayout title="Secure Updates (SOUP)" subtitle="Verify, apply, scan, rollback, and audit update packages">
      <div className="flex flex-col gap-6">

        {/* ── Row 1: Verify & Apply ──────────────────────────────────── */}
        <motion.div
          {...fadeUp(0)}
          className="cyber-card p-6"
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
              style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
            >
              <ShieldCheck className="w-4 h-4 text-cyan" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Verify and Apply Package</h3>
              <p className="text-xs text-muted-foreground font-mono">
                Load a .qup file, verify its signature, then apply
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-3 items-end">
            <div className="xl:col-span-2 space-y-2">
              <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                Package Path
              </label>
              <input
                value={packagePath}
                onChange={(e) => setPackagePath(e.target.value)}
                placeholder="E:\media\update_v1.1.0.qup"
                className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground font-mono outline-none focus:border-cyan/50 transition-colors"
              />
            </div>
            <button
              onClick={() => void browsePackage()}
              disabled={busy}
              className="xl:col-span-1 h-[42px] px-3 rounded-md text-xs font-semibold border border-border flex items-center justify-center gap-2 hover:border-cyan/40 hover:text-cyan transition-colors disabled:opacity-50"
            >
              <FolderOpen className="w-4 h-4" />
              Browse
            </button>
            <button
              onClick={() => void runVerify()}
              disabled={busy}
              className="xl:col-span-1 h-[42px] px-3 rounded-md text-xs font-semibold border border-border hover:border-cyan/40 hover:text-cyan transition-colors disabled:opacity-50"
            >
              Verify
            </button>
            <button
              onClick={() => void runApply()}
              disabled={busy}
              className="xl:col-span-1 h-[42px] px-3 rounded-md text-xs font-semibold border border-cyan/50 text-cyan hover:bg-cyan/10 transition-colors disabled:opacity-50"
              style={{ boxShadow: "0 0 12px hsl(var(--cyan) / 0.15)" }}
            >
              Apply Update
            </button>
          </div>

          {verifyResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.25 }}
              className="mt-4 rounded-lg border p-4 text-xs font-mono space-y-2"
              style={{
                borderColor: verifyResult.valid ? "hsl(var(--low) / 0.35)" : "hsl(var(--critical) / 0.35)",
                background: verifyResult.valid ? "hsl(var(--low) / 0.07)" : "hsl(var(--critical) / 0.07)",
              }}
            >
              <div className="flex items-center gap-2">
                {verifyResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-low shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-critical shrink-0" />
                )}
                <span
                  className="font-bold text-sm"
                  style={{ color: verifyResult.valid ? "hsl(var(--low))" : "hsl(var(--critical))" }}
                >
                  {verifyResult.valid ? "SIGNATURE VALID" : "VERIFICATION FAILED"}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground">
                <p>Message: <span className="text-foreground">{verifyResult.message}</span></p>
                <p>Type: <span className="text-foreground">{verifyResult.type ?? "unknown"}</span></p>
                <p>Version: <span className="text-foreground">{verifyResult.version ?? "unknown"}</span></p>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* ── Row 2: Scan + Rollback ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Scan Connected Devices */}
          <motion.div
            {...fadeUp(0.08)}
            className="cyber-card p-6 flex flex-col gap-4 lg:col-span-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                  style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
                >
                  <Search className="w-4 h-4 text-cyan" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Scan Connected Devices</h3>
                  <p className="text-xs text-muted-foreground font-mono">Detect .qup files on removable media</p>
                </div>
              </div>
              <button
                onClick={() => void runScan()}
                disabled={busy}
                className="h-9 px-4 rounded-md text-xs font-semibold border border-border flex items-center gap-2 hover:border-cyan/40 hover:text-cyan transition-colors disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                Scan for .qup
              </button>
            </div>

            {scanResults.length === 0 ? (
              <div
                className="flex-1 flex items-center justify-center rounded-lg border border-dashed border-border py-10 text-xs text-muted-foreground font-mono"
              >
                No packages found — run a scan to detect .qup files
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {scanResults.map((path) => (
                  <div
                    key={path}
                    className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5"
                    style={{ background: "hsl(var(--muted) / 0.4)" }}
                  >
                    <p className="text-xs font-mono text-muted-foreground break-all flex-1">{path}</p>
                    <button
                      onClick={() => setPackagePath(path)}
                      className="shrink-0 px-2.5 py-1 rounded border border-cyan/40 text-cyan text-xs hover:bg-cyan/10 transition-colors"
                    >
                      Use
                    </button>
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Rollback */}
          <motion.div
            {...fadeUp(0.16)}
            className="cyber-card p-6 flex flex-col gap-4"
          >
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--high) / 0.1)", border: "1px solid hsl(var(--high) / 0.25)" }}
              >
                <RotateCcw className="w-4 h-4 text-high" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Rollback</h3>
                <p className="text-xs text-muted-foreground font-mono">Revert to previous version</p>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wide font-semibold block">
                  Component Type
                </label>
                <select
                  value={rollbackType}
                  onChange={(e) => setRollbackType(e.target.value as UpdateType)}
                  className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-sm text-foreground outline-none focus:border-cyan/50 transition-colors"
                >
                  <option value="model">AI Model</option>
                  <option value="rules">Detection Rules</option>
                  <option value="mitre">MITRE Framework</option>
                </select>
              </div>

              <div
                className="rounded-lg p-3 text-xs font-mono space-y-1"
                style={{
                  background: "hsl(var(--high) / 0.07)",
                  border: "1px solid hsl(var(--high) / 0.2)",
                }}
              >
                <p className="text-muted-foreground">Selected component:</p>
                <p className="text-high font-semibold capitalize">{rollbackType}</p>
                <p className="text-muted-foreground pt-1">This action cannot be undone without a new update package.</p>
              </div>
            </div>

            <button
              onClick={() => void runRollback()}
              disabled={busy}
              className="w-full py-2.5 rounded-md text-xs font-semibold border border-high/40 text-high hover:bg-high/10 transition-colors disabled:opacity-50"
            >
              Rollback {rollbackType.charAt(0).toUpperCase() + rollbackType.slice(1)}
            </button>
          </motion.div>
        </div>

        {/* ── Row 3: Update History (full width) ────────────────────── */}
        <motion.div
          {...fadeUp(0.24)}
          className="cyber-card p-6 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
                style={{ background: "hsl(var(--cyan) / 0.1)", border: "1px solid hsl(var(--cyan) / 0.25)" }}
              >
                <History className="w-4 h-4 text-cyan" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Update History</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  {history.length} record{history.length !== 1 ? "s" : ""} logged
                </p>
              </div>
            </div>
            <button
              onClick={() => void refreshHistory()}
              disabled={historyLoading}
              className="h-8 px-3 rounded-md border border-border text-xs flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${historyLoading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {sortedHistory.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-xs text-muted-foreground font-mono">
              No updates logged yet — apply a package to see history
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-80 overflow-y-auto pr-1">
              {sortedHistory.map((entry, idx) => (
                <motion.div
                  key={`${entry.timestamp}-${idx}`}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-lg border border-border px-4 py-3 text-xs font-mono space-y-2"
                  style={{ background: "hsl(var(--muted) / 0.35)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-semibold capitalize"
                      style={{
                        background: "hsl(var(--cyan) / 0.1)",
                        color: "hsl(var(--cyan))",
                        border: "1px solid hsl(var(--cyan) / 0.25)",
                      }}
                    >
                      {entry.type}
                    </span>
                    <span className="text-muted-foreground">v{entry.version ?? "N/A"}</span>
                  </div>
                  <p className="text-muted-foreground">
                    {new Date(entry.timestamp).toLocaleString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: false,
                    })}
                  </p>
                  <p className="text-muted-foreground truncate" title={entry.hash ?? ""}>
                    Hash: <span className="text-foreground">{(entry.hash ?? "").slice(0, 20)}…</span>
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </AppLayout>
  );
}
