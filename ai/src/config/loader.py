"""AI 설정 파일의 경로 해석과 YAML 입출력을 담당합니다."""
from pathlib import Path
import yaml
from ai.src.config.schema import validate_config

AI_ROOT = Path(__file__).resolve().parents[2]


def resolve_path(value, root=AI_ROOT):
    """All relative paths in config are relative to ai/, never the process cwd."""
    path = Path(value).expanduser()
    return (path if path.is_absolute() else root / path).resolve()


def load_config(path):
    """YAML 파일을 읽고 generation/experiment 설정 객체로 검증합니다."""
    return validate_config(yaml.safe_load(Path(path).read_text(encoding="utf-8-sig")))


def dump_config(config):
    """설정 객체를 사람이 읽기 좋은 YAML 문자열로 직렬화합니다."""
    return yaml.safe_dump(config.model_dump(), allow_unicode=True, sort_keys=False)
