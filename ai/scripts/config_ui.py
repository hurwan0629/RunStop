"""로컬 설정 에디터 서버를 실행합니다."""
import argparse
import _bootstrap
from ai.src.web.server import make_server


if __name__ == "__main__":
    # 서버는 localhost에만 bind되고 학습/생성 실행 endpoint는 없습니다.
    parser = argparse.ArgumentParser(description="RunStop HTML config editor (local only; no training/generation)")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    server = make_server(args.port)
    print(f"RunStop Experiment Studio: http://127.0.0.1:{server.server_port}", flush=True)
    print("Ctrl+C to stop. Settings are saved under ai/configs/.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
