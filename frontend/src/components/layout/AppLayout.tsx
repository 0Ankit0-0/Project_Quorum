import { useState, useEffect, useCallback } from "react";
import Sidebar from "./Sidebar";

const SIDEBAR_KEY = "quorum-sidebar-collapsed";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export default function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  // Persist collapsed state across page navigations via localStorage
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    return localStorage.getItem(SIDEBAR_KEY) === "true";
  });

  // Live clock — updates every second
  const [time, setTime] = useState(() => new Date());

  const handleToggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem(SIDEBAR_KEY, String(next));
      return next;
    });
  }, []);

  // Tick the clock
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Keyboard shortcut: Ctrl+B (or Cmd+B on Mac) toggles the sidebar
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        handleToggle();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggle]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar collapsed={collapsed} onToggle={handleToggle} />

      {/* Main content — margin tracks sidebar width */}
      <div
        className="flex-1 flex flex-col overflow-hidden transition-all duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: collapsed ? 64 : 240 }}
      >
        {/* Header */}
        <header
          className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0"
          style={{ background: "hsl(var(--card))" }}
        >
          <div>
            <h1 className="text-base font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono"
              style={{
                background: "hsl(var(--low) / 0.1)",
                border: "1px solid hsl(var(--low) / 0.3)",
                color: "hsl(var(--low))",
              }}
            >
              <span>● OFFLINE MODE</span>
            </div>
            <div className="text-xs font-mono text-muted-foreground border-l border-border pl-3 tabular-nums">
              <div>{time.toLocaleTimeString("en-US", { hour12: false })}</div>
              <div>
                {time.toLocaleDateString("en-US", {
                  month: "short",
                  day: "2-digit",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
