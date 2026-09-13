from pathlib import Path
import yaml
from ai.src.config.schema import validate_config

AI_ROOT = Path(__file__).resolve().parents[2]


def resolve_path(value, root=AI_ROOT):
    """All relative paths in config are relative to ai/, never the process cwd."""
    path = Path(value).expanduser()
    return (path if path.is_absolute() else root / path).resolve()


def load_config(path):
    return validate_config(yaml.safe_load(Path(path).read_text(encoding="utf-8-sig")))


def dump_config(config):
    return yaml.safe_dump(config.model_dump(), allow_unicode=True, sort_keys=False)
