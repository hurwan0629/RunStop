"""로컬 전용 HTML 설정 에디터 서버입니다. 학습/생성 실행 endpoint는 제공하지 않습니다."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse
import json
import re
import secrets
import sys
import threading
import yaml
from ai.src.config.loader import AI_ROOT, dump_config
from ai.src.config.schema import ExperimentConfig, GenerationConfig, UtilityConfig, PARAM_SCHEMAS, validate_config
from ai.src.models.registry import catalog

STATIC = Path(__file__).with_name("static")
SAVE_LOCK = threading.Lock()


def config_target(root, kind, name):
    """저장할 설정 파일 경로를 configs 하위로 제한해 계산합니다."""
    if kind not in {"experiment", "generation"} or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", name):
        raise ValueError("이름은 영문·숫자·밑줄·하이픈 1~80자로 입력하세요")
    directory = root / "configs" / ("experiments" if kind == "experiment" else "generation")
    target = directory / (name + ".yaml")
    if not target.resolve().is_relative_to((root / "configs").resolve()):
        raise ValueError("Config path escapes configs directory")
    return target


def source_summary(root):
    """기본 synthetic 사용자 요청 파일의 간단한 요약을 반환합니다."""
    from ai.src.generation.user_sampler import load_users
    from ai.src.generation.request_sampler import normalize_requests
    from collections import Counter
    source = root / GenerationConfig().source_json
    try:
        users = load_users(source)
        jobs = normalize_requests(users)
        return {"users": len(users), "requests": len(jobs), "types": dict(Counter(j['args']['route_type'] for j in jobs)),
                "path": source.relative_to(root).as_posix(), "order": "JSON 배열 순서 · 실제 시각 없음"}
    except (ValueError, OSError, KeyError, TypeError) as exc:
        return {"error": str(exc), "path": str(source)}


def make_server(port=8765, root=AI_ROOT):
    """localhost에서만 접근 가능한 설정 에디터 HTTP 서버를 만듭니다."""
    root = Path(root).resolve()
    token = secrets.token_urlsafe(32)

    class Handler(BaseHTTPRequestHandler):
        """정적 파일과 설정 검증/저장 API만 처리하는 요청 handler입니다."""
        def log_message(self, fmt, *args):
            pass

        def send(self, status, payload, content_type="application/json; charset=utf-8"):
            """공통 보안 헤더와 함께 JSON 또는 bytes 응답을 보냅니다."""
            body = json.dumps(payload, ensure_ascii=False, allow_nan=False).encode("utf-8") if isinstance(payload, (dict, list)) else payload
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'")
            self.end_headers()
            self.wfile.write(body)

        def local_host(self):
            """Host 헤더가 현재 localhost 서버와 일치하는지 확인합니다."""
            allowed = {f"127.0.0.1:{self.server.server_port}", f"localhost:{self.server.server_port}"}
            return self.headers.get("Host") in allowed

        def do_GET(self):
            """catalog/config 목록과 정적 HTML/CSS/JS만 제공합니다."""
            if not self.local_host():
                return self.send(403, {"error": "Localhost access only"})
            path = urlparse(self.path).path
            if path == "/api/catalog":
                # 초기 화면 렌더링에 필요한 schema, 기본값, 모델 catalog를 한 번에 보냅니다.
                return self.send(200, {"token": token, "models": catalog(), "defaults": {"experiment": ExperimentConfig().model_dump(), "generation": GenerationConfig().model_dump()},
                                     "schemas": {"experiment": ExperimentConfig.model_json_schema(), "generation": GenerationConfig.model_json_schema()},
                                     "source": source_summary(AI_ROOT),
                                     "python_command": ('& "' + sys.executable + '"') if sys.platform == 'win32' else ('"' + sys.executable + '"')})
            if path == "/api/configs":
                # configs 폴더 안의 유효한 YAML만 목록에 포함합니다.
                entries = []
                for kind in ("experiment", "generation"):
                    folder = root / "configs" / ("experiments" if kind == "experiment" else "generation")
                    for file in sorted(folder.glob("*.yaml")):
                        if not file.resolve().is_relative_to((root / "configs").resolve()):
                            continue
                        try:
                            cfg = validate_config(yaml.safe_load(file.read_text(encoding="utf-8-sig")))
                            entries.append({"path": file.relative_to(root).as_posix(), "config": cfg.model_dump()})
                        except (ValueError, yaml.YAMLError):
                            continue
                return self.send(200, entries)
            assets = {"/": ("index.html", "text/html; charset=utf-8"), "/app.js": ("app.js", "application/javascript; charset=utf-8"), "/style.css": ("style.css", "text/css; charset=utf-8")}
            if path in assets:
                filename, mime = assets[path]
                return self.send(200, (STATIC / filename).read_bytes(), mime)
            self.send(404, {"error": "Not found"})

        def do_POST(self):
            """설정 검증, 저장, YAML import만 처리합니다."""
            if not self.local_host() or self.headers.get("X-RunStop-Token") != token:
                return self.send(403, {"error": "Invalid local session"})
            origin = self.headers.get("Origin")
            if origin and origin not in {f"http://localhost:{self.server.server_port}", f"http://127.0.0.1:{self.server.server_port}"}:
                return self.send(403, {"error": "Invalid origin"})
            path = urlparse(self.path).path
            if path not in {"/api/validate", "/api/save", "/api/import"}:
                return self.send(404, {"error": "No execution endpoint exists"})
            try:
                # 요청 body 크기를 제한하고 YAML/config를 공통 schema로 검증합니다.
                length = int(self.headers.get("Content-Length", 0))
                if not 0 < length <= 1_000_000:
                    raise ValueError("Request must be between 1 byte and 1 MB")
                body = json.loads(self.rfile.read(length))
                raw = yaml.safe_load(body["yaml"]) if path == "/api/import" else body["config"]
                config = validate_config(raw)
                text = dump_config(config)
                result = {"config": config.model_dump(), "yaml": text}
                if path == "/api/save":
                    # 같은 이름을 덮어쓰지 않고 새 설정 파일만 생성합니다.
                    target = config_target(root, config.kind, body["name"])
                    with SAVE_LOCK:
                        target.parent.mkdir(parents=True, exist_ok=True)
                        # Never overwrite: rename experiments to preserve previous configurations.
                        with target.open("x", encoding="utf-8", newline="\n") as stream:
                            stream.write(text)
                    result["path"] = target.relative_to(root).as_posix()
                self.send(200, result)
            except FileExistsError:
                self.send(409, {"error": "같은 이름의 YAML이 있습니다. 다른 이름으로 저장하세요"})
            except (ValueError, KeyError, TypeError, OSError, yaml.YAMLError) as exc:
                self.send(400, {"error": str(exc)})

    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.daemon_threads = True
    return server
