import os
import sys
import time
import uuid
from collections import deque
from datetime import datetime
from typing import Any, Optional, List, Dict

# ANSI Color Codes
RESET = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"

# Foreground Colors
CYAN = "\033[36m"
BRIGHT_CYAN = "\033[96m"
MAGENTA = "\033[35m"
BRIGHT_MAGENTA = "\033[95m"
GREEN = "\033[32m"
BRIGHT_GREEN = "\033[92m"
YELLOW = "\033[33m"
BRIGHT_YELLOW = "\033[93m"
RED = "\033[31m"
BRIGHT_RED = "\033[91m"
BLUE = "\033[34m"
BRIGHT_BLUE = "\033[94m"
GRAY = "\033[90m"
WHITE = "\033[97m"

class BackendLogger:
    """
    Dedicated high-contrast, color-coded logger for Free API Hub Backend.
    Distinguishes backend events from frontend logs with [BACKEND] tags.
    Maintains an in-memory ring buffer of the latest 250 structured events
    for live browser UI streaming and writes persistent entries to logs/backend.log.
    """
    PREFIX = f"{BOLD}{BRIGHT_CYAN}[BACKEND]{RESET}"

    def __init__(self, max_history: int = 250):
        self.history: deque = deque(maxlen=max_history)
        self.log_file_path: Optional[str] = self._resolve_log_file()

    def _resolve_log_file(self) -> Optional[str]:
        try:
            base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
            logs_dir = os.path.join(base_dir, "logs")
            os.makedirs(logs_dir, exist_ok=True)
            return os.path.join(logs_dir, "backend.log")
        except Exception:
            return None

    def _append_to_file(self, plain_text: str) -> None:
        if not self.log_file_path:
            return
        try:
            with open(self.log_file_path, "a", encoding="utf-8") as f:
                f.write(plain_text + "\n")
        except Exception:
            pass

    @staticmethod
    def _safe_print(text: str, file=None) -> None:
        target = file or sys.stdout
        try:
            target.write(text + "\n")
            target.flush()
        except Exception:
            try:
                if hasattr(target, "buffer"):
                    target.buffer.write((text + "\n").encode("utf-8", errors="replace"))
                    target.buffer.flush()
                else:
                    print(text, file=target, flush=True)
            except Exception:
                pass

    @staticmethod
    def _timestamp() -> str:
        return datetime.now().strftime('%H:%M:%S')

    def _record_event(
        self,
        level: str,
        category: str,
        message: str,
        method: Optional[str] = None,
        path: Optional[str] = None,
        status_code: Optional[int] = None,
        latency_ms: Optional[float] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        entry = {
            "id": f"be_{uuid.uuid4().hex[:8]}",
            "source": "backend",
            "timestamp": self._timestamp(),
            "time_iso": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
            "level": level.upper(),
            "category": category.upper(),
            "message": message,
            "method": method,
            "path": path,
            "status_code": status_code,
            "latency_ms": latency_ms,
            "details": details or {}
        }
        self.history.append(entry)
        self._append_to_file(f"[{entry['time_iso']}] [{entry['level']}] [{entry['category']}] {message}")

    def info(self, msg: str, *args: Any) -> None:
        formatted = msg % args if args else msg
        badge = f"{BOLD}{BRIGHT_BLUE}INFO {RESET}"
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} {formatted}")
        self._record_event(level="INFO", category="SYSTEM", message=formatted)

    def success(self, msg: str, *args: Any) -> None:
        formatted = msg % args if args else msg
        badge = f"{BOLD}{BRIGHT_GREEN}OK   {RESET}"
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} {BRIGHT_GREEN}{formatted}{RESET}")
        self._record_event(level="SUCCESS", category="SYSTEM", message=formatted)

    def warning(self, msg: str, *args: Any) -> None:
        formatted = msg % args if args else msg
        badge = f"{BOLD}{BRIGHT_YELLOW}WARN {RESET}"
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} {YELLOW}{formatted}{RESET}")
        self._record_event(level="WARN", category="SYSTEM", message=formatted)

    def error(self, msg: str, *args: Any, exc: Optional[Exception] = None) -> None:
        formatted = msg % args if args else msg
        badge = f"{BOLD}{BRIGHT_RED}ERROR{RESET}"
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        err_detail = f" | Exception: {str(exc)}" if exc else ""
        self._safe_print(f"{self.PREFIX} {time_str} {badge} {RED}{formatted}{err_detail}{RESET}", file=sys.stderr)
        self._record_event(level="ERROR", category="SYSTEM", message=f"{formatted}{err_detail}", details={"exception": str(exc)} if exc else {})

    def http_request(self, method: str, path: str, status_code: int, duration_ms: float, client_ip: str = "") -> None:
        """
        Formatted logging for HTTP requests handled by FastAPI.
        """
        from app.security import sanitize_url_for_logging
        clean_path = sanitize_url_for_logging(path)

        method_colors = {
            "GET": f"{BRIGHT_GREEN}{method:<6}{RESET}",
            "POST": f"{BRIGHT_BLUE}{method:<6}{RESET}",
            "PUT": f"{BRIGHT_YELLOW}{method:<6}{RESET}",
            "DELETE": f"{BRIGHT_RED}{method:<6}{RESET}",
            "PATCH": f"{BRIGHT_MAGENTA}{method:<6}{RESET}",
            "OPTIONS": f"{GRAY}{method:<6}{RESET}",
        }
        method_str = method_colors.get(method.upper(), f"{WHITE}{method:<6}{RESET}")

        if status_code < 300:
            status_str = f"{BRIGHT_GREEN}{status_code} OK{RESET}"
        elif status_code < 400:
            status_str = f"{BRIGHT_CYAN}{status_code} REDIRECT{RESET}"
        elif status_code < 500:
            status_str = f"{BRIGHT_YELLOW}{status_code} CLIENT ERR{RESET}"
        else:
            status_str = f"{BRIGHT_RED}{status_code} SERVER ERR{RESET}"

        if duration_ms < 50:
            dur_str = f"{GRAY}{duration_ms:.1f}ms{RESET}"
        elif duration_ms < 300:
            dur_str = f"{YELLOW}{duration_ms:.1f}ms{RESET}"
        else:
            dur_str = f"{BRIGHT_RED}{duration_ms:.1f}ms{RESET}"

        badge = f"{BOLD}{MAGENTA}HTTP {RESET}"
        ip_str = f" {GRAY}({client_ip}){RESET}" if client_ip else ""
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} {method_str} {WHITE}{clean_path}{RESET} -> {status_str} in {dur_str}{ip_str}")

        level = "ERROR" if status_code >= 500 else ("WARN" if status_code >= 400 else "INFO")
        self._record_event(
            level=level,
            category="HTTP",
            message=f"{method.upper()} {clean_path} -> {status_code} ({duration_ms:.1f}ms)",
            method=method.upper(),
            path=clean_path,
            status_code=status_code,
            latency_ms=round(duration_ms, 1),
            details={"client_ip": client_ip}
        )

    def proxy(self, target_url: str, method: str, status_code: int, latency_ms: int) -> None:
        """
        Formatted logging for CORS proxy outbound relays.
        """
        from app.security import sanitize_url_for_logging
        clean_url = sanitize_url_for_logging(target_url)

        badge = f"{BOLD}{BRIGHT_CYAN}PROXY{RESET}"
        status_color = BRIGHT_GREEN if status_code < 400 else (BRIGHT_YELLOW if status_code < 500 else BRIGHT_RED)
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} Relay {BOLD}{method}{RESET} {clean_url} -> {status_color}{status_code}{RESET} ({latency_ms}ms)")

        level = "ERROR" if status_code >= 500 else ("WARN" if status_code >= 400 else "INFO")
        self._record_event(
            level=level,
            category="PROXY",
            message=f"Relay {method.upper()} {clean_url} -> HTTP {status_code}",
            method=method.upper(),
            path=clean_url,
            status_code=status_code,
            latency_ms=latency_ms
        )

    def health(self, slug: str, status: str, latency_ms: int, status_code: int) -> None:
        """
        Formatted logging for health checks and pings.
        """
        badge = f"{BOLD}{BRIGHT_GREEN}PULSE{RESET}"
        status_color = BRIGHT_GREEN if status.lower() == "healthy" else (BRIGHT_YELLOW if status.lower() == "degraded" else BRIGHT_RED)
        time_str = f"{GRAY}{self._timestamp()}{RESET}"
        self._safe_print(f"{self.PREFIX} {time_str} {badge} Probe [{CYAN}{slug}{RESET}] -> {status_color}{status.upper()}{RESET} (HTTP {status_code}, {latency_ms}ms)")

        level = "ERROR" if status.lower() == "offline" else ("WARN" if status.lower() == "degraded" else "INFO")
        self._record_event(
            level=level,
            category="HEALTH",
            message=f"Probe [{slug}] -> {status.upper()} (HTTP {status_code})",
            status_code=status_code,
            latency_ms=latency_ms,
            details={"slug": slug, "health_status": status}
        )

    def get_logs(self, limit: int = 100, level: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Retrieves recent structured logs filtered by level or category.
        """
        items = list(self.history)
        if level:
            items = [item for item in items if item["level"] == level.upper()]
        if category:
            items = [item for item in items if item["category"] == category.upper()]
        return items[-limit:]

logger = BackendLogger()
