from pathlib import Path
import sys

# Import ai.src, never the generic src used by routing-worker.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
