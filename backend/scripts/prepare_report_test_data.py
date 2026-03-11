"""
Reset generated outputs and create report test datasets.

Creates plaintext log files in data/uploads:
- test_logs_100.log
- test_logs_1000.log
- test_logs_10000.log
"""
from __future__ import annotations

from datetime import datetime, timedelta
import json
from pathlib import Path
import shutil

import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from config.settings import settings


def _safe_clear_directory(path: Path) -> None:
    if not path.exists():
        return
    for item in path.iterdir():
        if item.is_dir():
            shutil.rmtree(item, ignore_errors=True)
        else:
            item.unlink(missing_ok=True)


def _reset_dataset_manifest() -> None:
    datasets_dir = settings.DB_DIR / "datasets"
    datasets_dir.mkdir(parents=True, exist_ok=True)
    _safe_clear_directory(datasets_dir)
    manifest_path = datasets_dir / "manifest.json"
    manifest_path.write_text(json.dumps({"datasets": []}, indent=2), encoding="utf-8")


def _clear_generated_outputs() -> None:
    print("Clearing generated outputs...")
    _safe_clear_directory(settings.REPORTS_DIR)
    _safe_clear_directory(settings.DATA_DIR / "exports")
    _safe_clear_directory(settings.DATA_DIR / "updates")
    _safe_clear_directory(settings.DATA_DIR / "tmp")
    _safe_clear_directory(settings.DATA_DIR / "uploads")
    _reset_dataset_manifest()

    # Optional generated history files
    (settings.DATA_DIR / "update_history.json").unlink(missing_ok=True)


def _severity_for_index(i: int) -> str:
    # Roughly: 5% critical, 15% high, 30% medium, 50% low
    mod = i % 20
    if mod == 0:
        return "CRITICAL"
    if mod in {1, 2, 3}:
        return "HIGH"
    if mod in {4, 5, 6, 7, 8, 9}:
        return "MEDIUM"
    return "LOW"


def _message_for_severity(sev: str, idx: int) -> str:
    if sev == "CRITICAL":
        return f"Multiple failed admin logins and privilege escalation detected (case={idx})"
    if sev == "HIGH":
        return f"Unauthorized access attempt blocked by policy engine (case={idx})"
    if sev == "MEDIUM":
        return f"Warning: unusual process execution pattern observed (case={idx})"
    return f"Routine service heartbeat completed successfully (case={idx})"


def _write_log_file(path: Path, count: int) -> None:
    now = datetime.utcnow()
    with path.open("w", encoding="utf-8") as handle:
        for i in range(count):
            ts = (now - timedelta(seconds=(count - i))).isoformat()
            sev = _severity_for_index(i)
            msg = _message_for_severity(sev, i)
            # PlaintextParser supports ISO timestamp + message format.
            handle.write(f"{ts} severity={sev} source=simulated_node message=\"{msg}\"\n")


def _generate_test_files() -> None:
    uploads_dir = settings.DATA_DIR / "uploads"
    uploads_dir.mkdir(parents=True, exist_ok=True)

    targets = [
        ("test_logs_100.log", 100),
        ("test_logs_1000.log", 1000),
        ("test_logs_10000.log", 10000),
    ]
    print("Generating test datasets...")
    for filename, count in targets:
        out = uploads_dir / filename
        _write_log_file(out, count)
        print(f"  - {filename}: {count} lines")


def main() -> None:
    _clear_generated_outputs()
    _generate_test_files()
    print("\nDone. Test datasets are ready in backend/data/uploads/")


if __name__ == "__main__":
    main()
