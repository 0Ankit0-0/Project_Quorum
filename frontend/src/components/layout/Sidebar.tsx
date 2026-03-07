import {
  Shield,
  LayoutDashboard,
  FileText,
  Radio,
  Cpu,
  FlaskConical,
  Network,
  BarChart3,
  Terminal,
  CloudUpload,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: FileText, label: "Logs", path: "/logs" },
  { icon: Radio, label: "Monitor", path: "/monitor" },
  { icon: Cpu, label: "Devices", path: "/devices" },
  { icon: FlaskConical, label: "Analysis", path: "/analysis" },
  { icon: Network, label: "Hub", path: "/hub" },
  { icon: BarChart3, label: "Reports", path: "/reports" },
  { icon: Terminal, label: "Terminal", path: "/terminal" },
  { icon: CloudUpload, label: "Updates", path: "/updates" },
];

const bottomNavItems = [{ icon: Settings, label: "Settings", path: "/settings" }];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  systemOnline: boolean;
}

function NavItem({
  item,
  collapsed,
  isActive,
}: {
  item: { icon: React.ElementType; label: string; path: string };
  collapsed: boolean;
  isActive: boolean;
}) {
  const content = (
    <Link to={item.path}>
      <motion.div
        className={`nav-item ${isActive ? "active" : ""}`}
        style={
          collapsed
            ? {
                justifyContent: "center",
                paddingLeft: "10px",
                paddingRight: "10px",
                ...(isActive && { borderLeft: "2px solid hsl(var(--cyan))" }),
              }
            : undefined
        }
        whileHover={{ x: collapsed ? 0 : 2 }}
        transition={{ duration: 0.15 }}
      >
        <item.icon className="w-4 h-4 shrink-0" />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              key="label"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 whitespace-nowrap overflow-hidden"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && isActive && <ChevronRight className="w-3 h-3 opacity-60 shrink-0" />}
      </motion.div>
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <div>{content}</div>;
}

export default function Sidebar({ collapsed, onToggle, systemOnline }: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) =>
    location.pathname === path || (path !== "/" && location.pathname.startsWith(path));

  return (
    <motion.aside
      className="fixed left-0 top-0 h-screen flex flex-col z-50 border-r border-border overflow-hidden"
      style={{ background: "hsl(var(--sidebar-background))" }}
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
    >
      <div
        className="flex items-center border-b border-border shrink-0 overflow-hidden"
        style={{
          height: 57,
          padding: collapsed ? "0 8px" : "0 12px",
          justifyContent: collapsed ? "center" : "space-between",
          gap: "8px",
        }}
      >
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
              className="flex items-center gap-3 overflow-hidden whitespace-nowrap min-w-0"
            >
              <div className="relative shrink-0">
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center"
                  style={{
                    background: "hsl(var(--cyan) / 0.15)",
                    border: "1px solid hsl(var(--cyan) / 0.4)",
                  }}
                >
                  <Shield className="w-4 h-4 text-cyan" />
                </div>
                <div
                  className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse ${
                    systemOnline ? "bg-cyber-low" : "bg-cyber-critical"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="font-bold text-base tracking-wide text-foreground">QUORUM</p>
                <p className="text-xs text-muted-foreground font-mono">
                  v2.4.1 - {systemOnline ? "ONLINE" : "OFFLINE"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggle}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar (Ctrl+B)"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar (Ctrl+B)"}
              className="h-8 w-8 shrink-0 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              style={{
                background: "hsl(var(--sidebar-accent) / 0.35)",
              }}
            >
              <motion.div
                initial={false}
                animate={{ rotate: collapsed ? 0 : 180 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-4 h-4" />
                ) : (
                  <PanelLeftClose className="w-4 h-4" />
                )}
              </motion.div>
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            {collapsed ? "Expand sidebar" : "Collapse sidebar (Ctrl+B)"}
          </TooltipContent>
        </Tooltip>
      </div>

      <nav
        className="flex-1 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden"
        style={{
          paddingLeft: collapsed ? "8px" : "12px",
          paddingRight: collapsed ? "8px" : "12px",
        }}
      >
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.p
              key="nav-label"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2 whitespace-nowrap"
            >
              Navigation
            </motion.p>
          )}
        </AnimatePresence>

        {mainNavItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isActive(item.path)} />
        ))}
      </nav>

      <div
        className="shrink-0 border-t border-border"
        style={{
          padding: collapsed ? "8px" : "8px 12px",
        }}
      >
        {!collapsed && (
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-2 whitespace-nowrap">
            System
          </p>
        )}
        {bottomNavItems.map((item) => (
          <NavItem key={item.path} item={item} collapsed={collapsed} isActive={isActive(item.path)} />
        ))}
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            key="status-footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden shrink-0"
          >
            <div className="px-4 py-4 border-t border-border">
              <div
                className="rounded-md p-3 space-y-2"
                style={{
                  background: "hsl(var(--cyan) / 0.05)",
                  border: "1px solid hsl(var(--cyan) / 0.15)",
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Backend</span>
                  <span
                    className={`text-xs font-semibold font-mono ${
                      systemOnline ? "text-cyber-low" : "text-cyber-critical"
                    }`}
                  >
                    {systemOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Environment</span>
                  <span className="text-xs font-semibold text-cyan font-mono">AIR-GAPPED</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <div
                    className={`pulse-dot ${systemOnline ? "bg-cyber-low" : "bg-cyber-critical"}`}
                  />
                  <span
                    className={`text-xs ${systemOnline ? "text-cyber-low" : "text-cyber-critical"}`}
                  >
                    {systemOnline ? "System Operational" : "Backend Unreachable"}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}
