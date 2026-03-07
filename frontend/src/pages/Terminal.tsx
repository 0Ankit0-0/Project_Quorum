import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TerminalSquare,
  ChevronRight,
  CornerDownLeft,
  Trash2,
  Copy,
  BookOpen,
} from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import {
  exportSyncPackage,
  generateReport,
  getDevices,
  getHubInfo,
  getLogs,
  getNodes,
  getRootInfo,
  getSessions,
  getSystemStatus,
  runAnalysis,
} from "@/lib/api-functions";
import { cliService } from "@/lib/cliService";

interface TerminalLine {
  id: number;
  type: "input" | "output" | "error" | "system";
  text: string;
  timestamp: string;
}

const ts = () =>
  new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const initialLines: TerminalLine[] = [];

interface CmdCategory {
  label: string;
  color: string;
  cmds: { cmd: string; desc: string; usage?: string }[];
}

const quickCmdCategories: CmdCategory[] = [
  {
    label: "System",
    color: "hsl(var(--cyan))",
    cmds: [
      { cmd: "quorum status", desc: "System status overview", usage: "quorum status" },
      { cmd: "quorum init", desc: "Initialize Quorum database and configuration", usage: "quorum init" },
      { cmd: "whoami", desc: "Current node info", usage: "whoami" },
      { cmd: "uptime", desc: "System uptime", usage: "uptime" },
      { cmd: "version", desc: "Quorum version", usage: "version" },
      { cmd: "clear", desc: "Clear terminal", usage: "clear" },
    ],
  },
  {
    label: "Logs",
    color: "hsl(var(--medium))",
    cmds: [
      { cmd: "quorum ingest scan", desc: "Auto-discover system log files", usage: "quorum ingest scan" },
      { cmd: "quorum ingest collect", desc: "Collect and import discovered logs into database", usage: "quorum ingest collect" },
      { cmd: "quorum ingest file <file_path>", desc: "Import a specific log file", usage: "quorum ingest file <file_path>" },
      { cmd: "logs recent", desc: "Show recent log entries", usage: "logs recent" },
    ],
  },
  {
    label: "Analysis",
    color: "hsl(var(--purple))",
    cmds: [
      { cmd: "quorum analyze run --algorithm ensemble", desc: "Run AI anomaly detection", usage: "quorum analyze run --algorithm <algorithm>" },
      { cmd: "quorum analyze sessions", desc: "List all analysis sessions", usage: "quorum analyze sessions" },
      { cmd: "analyze run", desc: "Run analysis session", usage: "analyze run" },
      { cmd: "analyze list", desc: "List analysis sessions", usage: "analyze list" },
    ],
  },
  {
    label: "Devices",
    color: "hsl(var(--info))",
    cmds: [
      { cmd: "quorum devices scan", desc: "Scan for USB devices and LAN nodes", usage: "quorum devices scan" },
      { cmd: "quorum devices watch", desc: "Monitor for USB hotplug events", usage: "quorum devices watch" },
      { cmd: "quorum devices history", desc: "Show device connection history", usage: "quorum devices history" },
      { cmd: "scan usb", desc: "Scan USB devices", usage: "scan usb" },
      { cmd: "scan lan", desc: "Scan LAN nodes", usage: "scan lan" },
    ],
  },
  {
    label: "Hub",
    color: "hsl(var(--info))",
    cmds: [
      { cmd: "quorum hub register --role terminal", desc: "Register this machine as a node", usage: "quorum hub register --role <role>" },
      { cmd: "quorum hub export", desc: "Export sync package for USB transfer", usage: "quorum hub export" },
      { cmd: "quorum hub scan-usb", desc: "Scan USB drives for sync packages", usage: "quorum hub scan-usb" },
      { cmd: "quorum hub nodes", desc: "List all registered nodes", usage: "quorum hub nodes" },
      { cmd: "quorum hub correlate", desc: "Find cross-node attack correlations", usage: "quorum hub correlate" },
      { cmd: "hub nodes", desc: "Show registered nodes", usage: "hub nodes" },
      { cmd: "hub export", desc: "Export sync package", usage: "hub export" },
    ],
  },
  {
    label: "Reports",
    color: "hsl(var(--high))",
    cmds: [
      { cmd: "quorum report generate --type pdf", desc: "Generate threat analysis report", usage: "quorum report generate --type <type>" },
      { cmd: "quorum report list", desc: "List all generated reports", usage: "quorum report list" },
      { cmd: "report gen", desc: "Generate report", usage: "report gen" },
    ],
  },
];

const CLI_DOC_CATEGORIES = ["system", "logs", "analysis", "monitor", "devices", "hub", "reports"] as const;
const CATEGORY_COLOR: Record<string, string> = {
  system: "hsl(var(--cyan))",
  logs: "hsl(var(--low))",
  analysis: "hsl(var(--purple))",
  monitor: "hsl(var(--medium))",
  devices: "hsl(var(--info))",
  hub: "hsl(var(--info))",
  reports: "hsl(var(--high))",
  terminal: "hsl(var(--cyan))",
};

export default function Terminal() {
  const [lines, setLines] = useState<TerminalLine[]>(initialLines);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [busy, setBusy] = useState(false);
  const [showCmdPanel, setShowCmdPanel] = useState(false);
  const [cmdCategories, setCmdCategories] = useState<CmdCategory[]>(quickCmdCategories);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(initialLines.length);
  const allCmds = cmdCategories.flatMap((c) => c.cmds);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  useEffect(() => {
    let mounted = true;

    const loadCliCommands = async () => {
      try {
        const docs = await Promise.allSettled(
          CLI_DOC_CATEGORIES.map(async (category) => {
            const commands = await cliService.getCommandsByCategory(category);
            return {
              label: category.charAt(0).toUpperCase() + category.slice(1),
              color: CATEGORY_COLOR[category] ?? "hsl(var(--cyan))",
              cmds: commands.map((c) => ({
                cmd: c.command,
                desc: c.description,
                usage: c.usage || c.command,
              })),
            } as CmdCategory;
          }),
        );

        const fulfilled = docs
          .filter((d): d is PromiseFulfilledResult<CmdCategory> => d.status === "fulfilled")
          .map((d) => d.value)
          .filter((cat) => cat.cmds.length > 0);

        if (mounted && fulfilled.length > 0) {
          setCmdCategories(fulfilled);
        }
      } catch {
        // Keep local quick command catalog as fallback
      }
    };

    void loadCliCommands();
    return () => {
      mounted = false;
    };
  }, []);

  const addLine = useCallback((type: TerminalLine["type"], text: string) => {
    const id = nextId.current++;
    setLines((prev) => [...prev, { id, type, text, timestamp: ts() }]);
  }, []);

  const executeCommand = async (rawCmd: string): Promise<string> => {
    const trimmed = rawCmd.trim();
    const cmd = trimmed.toLowerCase().replace(/^quorum\s+/, "").trim();

    if (cmd === "help") {
      return [
        "Available commands:",
        ...allCmds.map((c) => `  ${c.usage || c.cmd}  -- ${c.desc}`),
      ].join("\n");
    }

    if (cmd === "status") {
      const s = await getSystemStatus();
      return [
        "┌─ QUORUM SYSTEM STATUS ──────────────────────",
        `│  Environment : ${s.environment}`,
        `│  Total Logs  : ${s.total_logs.toLocaleString()}`,
        `│  Anomalies   : ${s.total_anomalies.toLocaleString()}`,
        `│  Sessions    : ${s.active_sessions}`,
        `│  Nodes Online: ${s.nodes_online}`,
        `│  Uptime      : ${s.uptime_hours} hours`,
        "└─────────────────────────────────────────────",
      ].join("\n");
    }

    if (cmd === "scan usb") {
      const d = await getDevices();
      if (d.usb.length === 0) return "No USB devices detected.";
      return [
        "USB Devices:",
        ...d.usb.map(
          (u) => `  [${u.id}] ${u.name}  type=${u.type}  risk=${u.risk}  id=${u.vid}:${u.pid}`,
        ),
      ].join("\n");
    }

    if (cmd === "scan lan") {
      const d = await getDevices();
      if (d.lan.length === 0) return "No LAN nodes detected.";
      return [
        "LAN Nodes:",
        ...d.lan.map(
          (n) => `  ${n.ip.padEnd(16)} ${n.hostname.padEnd(20)} ${n.status.padEnd(8)} risk=${n.risk}`,
        ),
      ].join("\n");
    }

    if (cmd === "logs recent") {
      const logs = await getLogs(5);
      if (logs.length === 0) return "No logs available.";
      return [
        "Last 5 log entries:",
        ...logs.map(
          (l) =>
            `  [${l.severity}] ${new Date(l.timestamp).toLocaleTimeString("en-US", { hour12: false })}  ${l.source}  ${l.message}`,
        ),
      ].join("\n");
    }

    if (cmd === "analyze run") {
      const result = await runAnalysis({
        algorithm: "auto",
        threshold: 0.65,
        log_source: "latest",
      });
      return [
        "┌─ ANALYSIS RESULT ───────────────────────────",
        `│  Session     : ${result.session_id ?? "N/A"}`,
        `│  Status      : ${result.status ?? "completed"}`,
        `│  Logs        : ${(result.logs_analyzed ?? 0).toLocaleString()}`,
        `│  Anomalies   : ${(result.anomalies_detected ?? 0).toLocaleString()}`,
        `│  Duration    : ${result.duration_seconds ?? 0}s`,
        "└─────────────────────────────────────────────",
      ].join("\n");
    }

    if (cmd === "analyze list" || cmd === "analyze sessions") {
      const sessions = await getSessions(5);
      if (sessions.length === 0) return "No analysis sessions found.";
      return [
        "Analysis Sessions:",
        ...sessions.map(
          (s) =>
            `  ${s.id}  ${s.algorithm.padEnd(16)} ${s.total_logs.toLocaleString().padStart(8)} logs  ${s.anomalies_found.toString().padStart(5)} anomalies`,
        ),
      ].join("\n");
    }

    if (cmd === "hub nodes") {
      const nodes = await getNodes();
      if (nodes.length === 0) return "No nodes registered.";
      return [
        "Registered Nodes:",
        ...nodes.map(
          (n) =>
            `  ${n.id}  ${n.hostname.padEnd(20)} ${n.role.padEnd(10)} ${n.status}  ${n.total_logs.toLocaleString()} logs`,
        ),
      ].join("\n");
    }

    if (cmd === "hub export") {
      const { filename, blob } = await exportSyncPackage("hub", true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return `Sync package exported: ${filename}`;
    }

    if (cmd === "report gen" || cmd === "report generate") {
      const sessions = await getSessions(1);
      const sessionId = sessions[0]?.id;
      const r = await generateReport("PDF", sessionId);
      return `Report generated: ${r.filename}`;
    }

    if (cmd === "devices scan") {
      const d = await getDevices();
      const usb = `USB: ${d.usb.length} detected`;
      const lan = `LAN: ${d.lan.length} detected`;
      return `${usb}\n${lan}`;
    }

    if (cmd === "whoami") {
      const hub = await getHubInfo();
      return `${hub.hostname}  role=${hub.role}  status=${hub.status}`;
    }

    if (cmd === "uptime") {
      const s = await getSystemStatus();
      return `System uptime: ${s.uptime_hours} hours`;
    }

    if (cmd === "version") {
      const root = await getRootInfo();
      return `${root.name} v${root.version} — ${root.status}`;
    }

    if (cmd === "logs ingest") {
      return "Use the Logs page upload zone to ingest files into the backend.";
    }

    try {
      const commandToRun = /^quorum\s+/i.test(trimmed) ? trimmed : `quorum ${trimmed}`;
      const response = await cliService.executeCommand({ command: commandToRun });
      if (response.exit_code !== 0) throw new Error(response.error || "Command failed");
      return response.output || "Command completed.";
    } catch {
      throw new Error(`Command not found: "${rawCmd}". Type "help" for available commands.`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = input.trim();
    if (!cmd || busy) return;

    setHistory((prev) => [cmd, ...prev]);
    setHistoryIdx(-1);
    addLine("input", cmd);

    if (cmd.toLowerCase() === "clear") {
      setLines([]);
      setInput("");
      return;
    }

    setBusy(true);
    setInput("");
    try {
      const output = await executeCommand(cmd);
      addLine("output", output);
    } catch (error) {
      addLine("error", error instanceof Error ? error.message : "Command failed");
    } finally {
      setBusy(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      const next = Math.min(historyIdx + 1, history.length - 1);
      setHistoryIdx(next);
      if (history[next]) setInput(history[next]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = historyIdx - 1;
      setHistoryIdx(next);
      setInput(next < 0 ? "" : history[next] || "");
    }
  };

  const copyOutput = () => {
    const text = lines
      .map((l) => (l.type === "input" ? `$ ${l.text}` : l.text))
      .join("\n");
    void navigator.clipboard.writeText(text);
  };

  const lineColor = (type: TerminalLine["type"]) => {
    switch (type) {
      case "input":  return "hsl(var(--cyan))";
      case "error":  return "hsl(var(--critical))";
      case "system": return "hsl(var(--medium))";
      default:       return "hsl(var(--foreground) / 0.9)";
    }
  };

  return (
    <AppLayout title="Terminal" subtitle="Execute backend-connected Quorum commands">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col lg:flex-row gap-4"
        style={{ height: "calc(100vh - 104px)" }}
      >
        {/* ── Terminal panel ──────────────────────────────────────── */}
        <div
          className="flex-1 min-w-0 min-h-0 flex flex-col rounded-lg overflow-hidden border border-border"
          style={{
            background: "hsl(0 0% 3%)",
            boxShadow: "0 0 0 1px hsl(var(--cyan) / 0.08), 0 8px 32px hsl(0 0% 0% / 0.6)",
          }}
        >
          {/* Chrome title bar */}
          <div
            className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0"
            style={{ background: "hsl(220 30% 6%)" }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setLines([])}
                title="Clear terminal"
                className="w-3 h-3 rounded-full transition-opacity hover:opacity-80"
                style={{ background: "hsl(var(--critical) / 0.75)" }}
              />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(var(--medium) / 0.75)" }} />
              <div className="w-3 h-3 rounded-full" style={{ background: "hsl(var(--low) / 0.75)" }} />
            </div>

            <div className="w-px h-4 bg-border" />

            <TerminalSquare className="w-3.5 h-3.5 text-cyan shrink-0" />
            <span className="text-xs font-mono text-muted-foreground flex-1 truncate">
              quorum@hub-primary: ~ — bash
            </span>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {busy && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono mr-2"
                  style={{ background: "hsl(var(--cyan) / 0.08)", color: "hsl(var(--cyan))" }}>
                  <span className="animate-pulse">●</span>
                  <span>running</span>
                </div>
              )}
              <button
                onClick={copyOutput}
                title="Copy output"
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={() => setLines([])}
                title="Clear terminal"
                className="h-6 w-6 flex items-center justify-center rounded text-muted-foreground hover:text-critical transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
              <button
                onClick={() => setShowCmdPanel((v) => !v)}
                title="Toggle command list"
                className="h-6 px-2 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors lg:hidden"
              >
                <BookOpen className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Output area */}
          <div
            className="flex-1 overflow-y-auto p-4 space-y-0.5 cursor-text bg-[radial-gradient(circle_at_top,_hsl(var(--cyan)/0.06),_transparent_45%)]"
            onClick={() => inputRef.current?.focus()}
          >
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <motion.div
                  key={line.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.12 }}
                  className="flex gap-2 font-mono text-[13px] leading-relaxed group"
                >
                  {/* Timestamp */}
                  <span className="text-[10px] text-muted-foreground/40 font-mono shrink-0 mt-[3px] opacity-0 group-hover:opacity-100 transition-opacity select-none w-[54px]">
                    {line.timestamp}
                  </span>

                  {/* Prompt prefix for input lines */}
                  {line.type === "input" && (
                    <span className="select-none shrink-0 font-bold" style={{ color: "hsl(var(--cyan))" }}>
                      ❯
                    </span>
                  )}
                  {line.type === "error" && (
                    <span className="select-none shrink-0" style={{ color: "hsl(var(--critical))" }}>
                      ✗
                    </span>
                  )}
                  {line.type === "system" && (
                    <span className="select-none shrink-0" style={{ color: "hsl(var(--medium))" }}>
                      ◆
                    </span>
                  )}

                  <pre
                    className="whitespace-pre-wrap break-words flex-1 min-w-0"
                    style={{ color: lineColor(line.type) }}
                  >
                    {line.text}
                  </pre>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Busy indicator */}
            {busy && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 font-mono text-[13px] mt-1"
              >
                <span className="w-[54px]" />
                <span className="text-cyan/60 animate-pulse">▋</span>
                <span className="text-muted-foreground/50 text-xs">executing…</span>
              </motion.div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input bar */}
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-3 px-4 py-3 border-t shrink-0"
            style={{
              background: "hsl(220 30% 4%)",
              borderColor: busy ? "hsl(var(--cyan) / 0.25)" : "hsl(var(--border))",
              transition: "border-color 0.2s",
            }}
          >
            <span
              className="font-mono text-sm select-none font-bold shrink-0"
              style={{ color: "hsl(var(--cyan))" }}
            >
              ❯
            </span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              className="flex-1 bg-transparent outline-none font-mono text-sm text-foreground placeholder:text-muted-foreground/40"
              style={{ caretColor: "hsl(var(--cyan))" }}
              placeholder={busy ? "Command running…" : "Enter command  (↑↓ history)"}
              disabled={busy}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-all disabled:opacity-30"
              style={{
                background: "hsl(var(--cyan) / 0.08)",
                borderColor: "hsl(var(--cyan) / 0.3)",
                color: "hsl(var(--cyan))",
              }}
            >
              <CornerDownLeft className="w-3 h-3" />
              Run
            </button>
          </form>
        </div>

        {/* ── Command reference sidebar ────────────────────────────── */}
        <div
          className={`${showCmdPanel ? "flex" : "hidden"} lg:flex lg:w-80 h-64 lg:h-auto shrink-0 flex-col rounded-lg border border-border overflow-hidden`}
          style={{ background: "hsl(var(--card))" }}
        >
          {/* Sidebar header */}
          <div
            className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0"
            style={{ background: "hsl(var(--sidebar-background))" }}
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan shrink-0" />
            <span className="text-xs font-semibold text-foreground">Commands</span>
            <span className="ml-auto text-[10px] font-mono text-muted-foreground">
              {allCmds.length} total
            </span>
          </div>

          {/* Scrollable command list */}
          <div className="flex-1 overflow-y-auto py-2">
            {cmdCategories.map((cat) => (
              <div key={cat.label} className="mb-1">
                <div className="flex items-center gap-2 px-4 py-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ background: cat.color }}
                  />
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider"
                    style={{ color: cat.color }}
                  >
                    {cat.label}
                  </span>
                </div>
                <div className="px-2 space-y-0.5">
                  {cat.cmds.map((c) => (
                    <button
                      key={c.cmd}
                      onClick={() => {
                        setInput(c.usage || c.cmd);
                        setShowCmdPanel(false);
                        inputRef.current?.focus();
                      }}
                      className="w-full flex items-start gap-2.5 px-2 py-1.5 rounded-md text-left transition-all hover:bg-muted group"
                    >
                      <ChevronRight
                        className="w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: cat.color }}
                      />
                      <div className="min-w-0">
                        <code
                          className="text-[11px] font-mono font-semibold block"
                          style={{ color: cat.color }}
                        >
                          {c.usage || c.cmd}
                        </code>
                        <span className="text-[10px] text-muted-foreground leading-tight">
                          {c.desc}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer tip */}
          <div
            className="px-4 py-3 border-t border-border shrink-0"
            style={{ background: "hsl(var(--sidebar-background))" }}
          >
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
              ↑↓ navigate history<br />
              click command to fill input
            </p>
          </div>
        </div>
      </motion.div>
    </AppLayout>
  );
}

