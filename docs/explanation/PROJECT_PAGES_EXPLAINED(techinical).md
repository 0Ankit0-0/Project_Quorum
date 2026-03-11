# Quorum Project Pages Explained (Simple Guide)

## 1. Short Project Intro
Quorum is an offline-first cybersecurity platform.  
Its main job is to collect logs, run AI-based anomaly detection, show security insights, support multi-node sync, and apply secure offline updates.

In simple words:
- It helps security teams watch systems.
- It detects suspicious behavior.
- It gives reports and history.
- It supports safe updates in air-gapped environments.

---

## 2. How the Frontend Is Organized
The app uses React + TypeScript and route-based pages.

Main structure:
- `App.tsx` defines routes (`/`, `/logs`, `/analysis`, etc.).
- `AppLayout.tsx` gives common page shell:
  - title + subtitle
  - live time/date
  - online/offline backend badge
  - sidebar + main content area
- `Sidebar.tsx` gives navigation links and system status block.
- `api-functions.ts` is the API layer that talks to backend endpoints.

Why this structure:
- Same layout for all pages
- Cleaner code reuse
- Easy to maintain and scale

---

## 3. Page-by-Page Explanation

## Dashboard Page (`/`)
What it does:
- Shows overall system summary.

Main features:
- Total logs, anomalies, sessions, nodes
- Severity chart
- Timeline chart
- Recent anomaly table

How it works:
- Uses `useQuorumData` hook to fetch status, anomalies, timeline, and severity data.
- Renders cards + charts + table.

Why it is there:
- Gives quick health view of whole system in one screen.

Main components used:
- `AppLayout`
- Recharts (`BarChart`, `AreaChart`)
- `StatCard`, `SeverityBadge` (inside page)

---

## Logs Page (`/logs`)
What it does:
- Uploads logs and shows dataset-based log viewer.

Main features:
- Drag-and-drop upload
- Ingestion progress
- Dataset selection
- Search in selected dataset logs
- Auto-refresh option

How it works:
- Calls upload API and ingestion APIs from `api-functions`.
- Loads uploaded file list and fetches logs for selected file.

Why it is there:
- Log data is the input for analysis. This page is the main data entry point.

Main components used:
- `AppLayout`
- Upload/drop zone UI

---

## Analysis Page (`/analysis`)
What it does:
- Runs AI anomaly detection.

Main features:
- Algorithm selection
- Threshold/sensitivity slider
- Log source selection (all/latest/specific file)
- Run analysis button
- Analysis session history
- MITRE heatmap section

How it works:
- Sends analysis payload to backend (`runAnalysis`).
- Refreshes session data after run.

Why it is there:
- Core security intelligence page where detection is actually executed.

Main components used:
- `AppLayout`
- `Select`, `Slider`
- `MitreHeatmap`

---

## Monitoring Page (`/monitor`)
What it does:
- Shows live runtime monitoring.

Main features:
- Start/stop monitoring
- Live CPU/memory/disk/network cards
- Live samples table
- Device events feed
- Live log stream

How it works:
- Uses websocket + SSE + snapshot APIs.
- Falls back to polling if websocket fails.

Why it is there:
- For continuous real-time operations, not only one-time analysis.

Main components used:
- `AppLayout`
- Realtime stream logic in page state/effects

---

## Devices Page (`/devices`)
What it does:
- Tracks device connection/disconnection history.

Main features:
- Connected count
- Removed count
- High-risk count
- Full event history table with durations

How it works:
- Polls `getDeviceEvents` every few seconds.
- Calculates summary stats with `useMemo`.

Why it is there:
- Device behavior (USB/LAN) is important for threat detection in secure networks.

Main components used:
- `AppLayout`

---

## Hub Page (`/hub`)
What it does:
- Manages multi-node environment and cross-node threat correlation.

Main features:
- Register node
- Export sync package (`.qsp`)
- Node registry cards
- Correlation cards (MITRE + affected nodes + event counts)

How it works:
- Uses node/hub APIs (`registerNode`, `exportSyncPackage`) and shared data hook.

Why it is there:
- In real deployments, multiple terminals exist. Hub combines their insights.

Main components used:
- `AppLayout`

---

## Reports Page (`/reports`)
What it does:
- Generates and downloads report bundles per dataset.

Main features:
- Select dataset
- Generate report bundle
- List generated bundles
- Download `summary.json`, `anomalies.csv`, `ai_analysis.json`, or ZIP

How it works:
- Calls report APIs by selected dataset.
- Converts backend response blobs to browser downloads.

Why it is there:
- Converts analysis outputs into usable deliverables for teams/audits.

Main components used:
- `AppLayout`

---

## Terminal Page (`/terminal`)
What it does:
- Command-style interface for backend actions.

Main features:
- Command input/output
- History navigation
- Copy/clear output
- Help command
- Command reference panel (click to fill actual command usage)

How it works:
- Handles some commands directly for quick UX.
- Falls back to backend CLI execution (`/cli/execute`) for real command routing.
- Loads command docs from backend and shows actual usage commands.

Why it is there:
- Gives power-user workflow and quick operations without leaving UI.

Main components used:
- `AppLayout`
- `cliService`

---

## Updates Page (`/updates`)
What it does:
- Handles secure offline updates (SOUP).

Main features:
- Browse/select `.qup` package path
- Verify package signature
- Apply update
- Scan connected media for packages
- Rollback by type (`model`, `rules`, `mitre`)
- Update history

How it works:
- Uses `/updates` APIs for verify/apply/scan/rollback/history.
- Supports Tauri dialog for file browsing in desktop mode.

Why it is there:
- Safe updates are critical in air-gapped systems where internet auto-update is not used.

Main components used:
- `AppLayout`

---

## Settings Page (`/settings`)
What it does:
- Manages system settings and secure export.

Main features:
- Storage quota + usage bar
- Encryption config values
- Export system logs with passphrase and optional encryption

How it works:
- Calls storage, encryption, and export APIs.
- Downloads exported log package from backend.

Why it is there:
- Central place for operational controls and security-related configuration.

Main components used:
- `AppLayout`

---

## NotFound Page (`*`)
What it does:
- Shows 404 page for invalid routes.

Why it is there:
- Better user experience and route safety.

---

## Index Page (`Index.tsx`)
What it does:
- Placeholder fallback page template.

Current status:
- Not used in active router (`App.tsx` routes dashboard at `/`).

Why it is there:
- Starter template retained from initial scaffold.

---

## 4. Shared Components Worth Mentioning
These are reused across many pages:
- `AppLayout`: common shell + header status + page body
- `Sidebar`: navigation + online/offline indicator
- `Toaster/Sonner`: success/error notifications
- `Select`, `Slider`, and other UI primitives from `components/ui`

Why shared components matter:
- Consistent UI
- Faster development
- Less duplicate code

---

## 5. One-Line Summary (for Professor/External)
Quorum is a modular, offline-capable security dashboard where each page has a specific responsibility: ingest data, analyze threats, monitor live activity, manage nodes, generate reports, run CLI workflows, and securely apply updates.

---

## Questions Section (Write below)
You can write your questions below this line, and I will answer/update this file.

