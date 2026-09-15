from __future__ import annotations

import argparse
import html
import json
import shutil
from pathlib import Path

import _bootstrap
import yaml


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def metric_value(metrics: dict, predictor: str, key: str):
    return metrics["overall"][predictor][key]["mean"]


def fmt(value, digits: int = 4) -> str:
    return "-" if value is None else f"{value:.{digits}f}"


def esc(value) -> str:
    return html.escape(str(value), quote=True)


def bar(value, max_value, cost: bool = False) -> str:
    if value is None:
        return '<span class="muted">-</span>'
    width = max(2, min(100, value / max_value * 100 if max_value else 0))
    cls = "bar cost" if cost else "bar"
    return f'<div class="barbox"><span class="{cls}" style="width:{width:.2f}%"></span></div>'


def params_text(params: dict) -> str:
    return "{}" if not params else ", ".join(f"{key}={value}" for key, value in params.items())


def pct(value: float | None) -> str:
    return "-" if value is None else f"{value * 100:.1f}%"


def short_name(name: str) -> str:
    return name.removeprefix("sweep_")


def plot_label(name: str) -> str:
    words = short_name(name).split("_")
    if len(words) <= 2:
        return short_name(name)
    return "_".join(words[:1] + words[-2:])


def css_bar(value: float | None, max_value: float, class_name: str = "") -> str:
    if value is None:
        return '<span class="slide-muted">-</span>'
    width = max(2, min(100, value / max_value * 100 if max_value else 0))
    return f'<span class="slide-bar {class_name}" style="--w:{width:.2f}%"></span>'


def changed_params(row: dict, base: dict) -> list[str]:
    params = row["params"]
    base_params = base["params"]
    changes = [
        f"{key}: {base_params.get(key)} -> {value}"
        for key, value in params.items()
        if base_params.get(key) != value
    ]
    return changes or ["base"]


def collect_runs(artifact_root: Path) -> list[dict]:
    rows = []
    for path in sorted(artifact_root.iterdir()):
        if not path.is_dir() or not path.name.startswith("20260915_") or "sweep_" not in path.name:
            continue
        required = ["manifest.json", "metrics.json", "resource_usage.json", "config.yaml"]
        if not all((path / name).is_file() for name in required):
            continue

        manifest = read_json(path / "manifest.json")
        metrics = read_json(path / "metrics.json")
        resource = read_json(path / "resource_usage.json")
        config = yaml.safe_load((path / "config.yaml").read_text(encoding="utf-8"))
        diff = metrics["overall"].get("model_minus_baseline", {})

        rows.append({
            "artifact": path.name,
            "artifact_path": str(path),
            "name": manifest.get("name") or config.get("name"),
            "model": config["model"]["name"],
            "params": config["model"].get("params") or {},
            "status": manifest.get("status"),
            "started_at": manifest.get("started_at"),
            "finished_at": manifest.get("finished_at"),
            "ndcg": metric_value(metrics, "model", "ndcg@3"),
            "top1": metric_value(metrics, "model", "top1_best_utility"),
            "regret": metric_value(metrics, "model", "utility_regret"),
            "pairwise": metric_value(metrics, "model", "pairwise_accuracy"),
            "delta_top1": diff.get("top1_best_utility"),
            "delta_ndcg": diff.get("ndcg@3"),
            "delta_regret": diff.get("utility_regret"),
            "delta_pairwise": diff.get("pairwise_accuracy"),
            "train_seconds": resource.get("train_seconds"),
            "wall_seconds": resource.get("wall_seconds"),
            "cpu_seconds": resource.get("cpu_seconds"),
            "inference_ms_per_request": resource.get("inference_ms_per_request"),
            "peak_rss_mb": (resource.get("sampled_peak_rss_bytes") or 0) / 1024 / 1024,
            "model_mb": (resource.get("model_bundle_bytes") or 0) / 1024 / 1024,
        })
    return rows


def copy_light_run_files(rows: list[dict], artifact_root: Path, output: Path) -> None:
    runs = output / "runs"
    runs.mkdir(parents=True, exist_ok=True)
    for row in rows:
        source = artifact_root / row["artifact"]
        dest = runs / row["artifact"]
        dest.mkdir(parents=True, exist_ok=True)
        for name in ("config.yaml", "metrics.json", "resource_usage.json", "manifest.json"):
            shutil.copy2(source / name, dest / name)


def render_report(rows: list[dict]) -> str:
    rows = sorted(rows, key=lambda row: (-(row["top1"] or 0), -(row["ndcg"] or 0), row["regret"] or 999))
    maxes = {
        "top1": max(row["top1"] or 0 for row in rows) or 1,
        "ndcg": max(row["ndcg"] or 0 for row in rows) or 1,
        "pairwise": max(row["pairwise"] or 0 for row in rows) or 1,
        "infer": max(row["inference_ms_per_request"] or 0 for row in rows) or 1,
        "train": max(row["train_seconds"] or 0 for row in rows) or 1,
        "mem": max(row["peak_rss_mb"] or 0 for row in rows) or 1,
        "size": max(row["model_mb"] or 0 for row in rows) or 1,
    }

    best = [
        ("Top1 최고", max(rows, key=lambda row: row["top1"] or -1)),
        ("NDCG@3 최고", max(rows, key=lambda row: row["ndcg"] or -1)),
        ("Regret 최저", min(rows, key=lambda row: row["regret"] if row["regret"] is not None else 999)),
        ("추론 최단", min(rows, key=lambda row: row["inference_ms_per_request"] if row["inference_ms_per_request"] is not None else 999)),
        ("모델 최소", min(rows, key=lambda row: row["model_mb"] if row["model_mb"] is not None else 999)),
    ]
    cards = "".join(
        f'<div class="card"><span>{esc(title)}</span><strong>{esc(row["name"])}</strong>'
        f'<em>{esc(row["model"])}</em><small>Top1 {fmt(row["top1"])} · '
        f'NDCG {fmt(row["ndcg"])} · 추론 {row["inference_ms_per_request"]:.2f}ms</small></div>'
        for title, row in best
    )

    table_rows = []
    for index, row in enumerate(rows, 1):
        table_rows.append(
            "<tr>"
            f"<td>{index}</td>"
            f'<td><strong>{esc(row["name"])}</strong><br><span class="muted">{esc(row["artifact"])}</span></td>'
            f'<td>{esc(row["model"])}</td>'
            f'<td class="params">{esc(params_text(row["params"]))}</td>'
            f'<td>{fmt(row["top1"])}{bar(row["top1"], maxes["top1"])}</td>'
            f'<td>{fmt(row["ndcg"])}{bar(row["ndcg"], maxes["ndcg"])}</td>'
            f'<td>{fmt(row["regret"])}</td>'
            f'<td>{fmt(row["pairwise"])}{bar(row["pairwise"], maxes["pairwise"])}</td>'
            f'<td>{fmt(row["delta_top1"])}</td>'
            f'<td>{row["inference_ms_per_request"]:.2f}ms{bar(row["inference_ms_per_request"], maxes["infer"], True)}</td>'
            f'<td>{row["train_seconds"]:.2f}s{bar(row["train_seconds"], maxes["train"], True)}</td>'
            f'<td>{row["peak_rss_mb"]:.1f}MB{bar(row["peak_rss_mb"], maxes["mem"], True)}</td>'
            f'<td>{row["model_mb"]:.2f}MB{bar(row["model_mb"], maxes["size"], True)}</td>'
            "</tr>"
        )

    grouped = {}
    for row in rows:
        grouped.setdefault(row["model"], []).append(row)
    sections = []
    for model, items in sorted(grouped.items()):
        items = sorted(items, key=lambda row: row["name"])
        base = next((row for row in items if row["name"].endswith("_base") or row["name"].endswith("baseline")), items[0])
        item_rows = []
        for row in items:
            changes = [
                f'{key}: {base["params"].get(key)} -> {value}'
                for key, value in row["params"].items()
                if base["params"].get(key) != value
            ]
            item_rows.append(
                "<tr>"
                f'<td>{esc(row["name"])}</td><td>{esc(", ".join(changes) if changes else "base")}</td>'
                f'<td>{fmt(row["top1"])}</td><td>{fmt(row["ndcg"])}</td><td>{fmt(row["regret"])}</td>'
                f'<td>{row["inference_ms_per_request"]:.2f}ms</td><td>{row["train_seconds"]:.2f}s</td>'
                f'<td>{row["model_mb"]:.2f}MB</td>'
                "</tr>"
            )
        sections.append(
            f"<section><h2>{esc(model)}</h2><table><thead><tr><th>실험</th><th>변경 파라미터</th>"
            "<th>Top1</th><th>NDCG@3</th><th>Regret</th><th>추론/요청</th><th>학습</th><th>모델</th>"
            f"</tr></thead><tbody>{''.join(item_rows)}</tbody></table></section>"
        )

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RunStop AI Sweep Report</title>
<style>
:root{{--ink:#182522;--muted:#66736f;--line:#d8e1dd;--paper:#f6f8f7;--green:#14715d;--white:#fff}}
*{{box-sizing:border-box}}body{{margin:0;background:var(--paper);color:var(--ink);font:14px/1.55 Segoe UI,Malgun Gothic,Arial,sans-serif}}
main{{max-width:1480px;margin:0 auto;padding:34px 28px 60px}}h1{{margin:0 0 8px;font-size:30px;letter-spacing:0}}h2{{margin:28px 0 12px;font-size:18px}}p{{color:var(--muted);margin:0 0 20px}}
.grid{{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px;margin:22px 0}}.card{{background:var(--white);border:1px solid var(--line);border-radius:8px;padding:14px;min-height:132px}}
.card span{{display:block;color:var(--muted);font-size:12px}}.card strong{{display:block;margin:9px 0 4px;font-size:16px;overflow-wrap:anywhere}}.card em{{display:block;font-style:normal;color:var(--green);font-size:12px}}.card small{{display:block;color:var(--muted);margin-top:9px}}
.table-wrap{{overflow:auto;background:var(--white);border:1px solid var(--line);border-radius:8px}}table{{border-collapse:collapse;width:100%;min-width:1180px;background:var(--white)}}th,td{{border-bottom:1px solid var(--line);padding:10px 12px;text-align:left;vertical-align:top}}th{{position:sticky;top:0;background:#edf3f0;font-size:12px;white-space:nowrap}}td{{font-size:13px}}
.params{{max-width:330px;color:#34413d}}.muted{{color:var(--muted);font-size:12px}}.barbox{{height:6px;background:#e9eeeb;border-radius:999px;margin-top:6px;overflow:hidden}}.bar{{display:block;height:100%;background:var(--green)}}.bar.cost{{background:#64748b}}
section{{margin-top:24px}}.note{{background:#fff;border-left:4px solid var(--green);padding:12px 14px;color:#3f4f4a;margin:18px 0}}.footer{{margin-top:28px;color:var(--muted);font-size:12px}}
@media(max-width:900px){{main{{padding:24px 14px}}.grid{{grid-template-columns:1fr}}h1{{font-size:24px}}}}
</style>
</head>
<body>
<main>
<h1>RunStop AI Sweep Report</h1>
<p>2026-09-15 sweep artifact {len(rows)}개 비교. 입력 feature, dataset, split, evaluation은 고정하고 모델 파라미터를 하나씩 바꾼 실험 묶음입니다.</p>
<div class="grid">{cards}</div>
<div class="note">MRR은 현재 평가에서 제외되어 있습니다. 실제 사용자 단일 선택 로그가 아니라 synthetic utility 기반 전체 순위 데이터라서, relevant 기준을 ground_truth_rank==1로 잡으면 top1_best_utility와 해석이 크게 겹칩니다.</div>
<h2>전체 순위</h2>
<div class="table-wrap"><table><thead><tr><th>#</th><th>실험</th><th>모델</th><th>파라미터</th><th>Top1</th><th>NDCG@3</th><th>Regret</th><th>Pairwise</th><th>Top1 Δ</th><th>추론/요청</th><th>학습</th><th>Peak RSS</th><th>모델 크기</th></tr></thead><tbody>{''.join(table_rows)}</tbody></table></div>
{''.join(sections)}
<p class="footer">요약 JSON: summary.json · 각 run의 config/metrics/resource/manifest 사본: runs/ · 원본 artifact 경로는 summary.json의 artifact_path 참고.</p>
</main>
</body>
</html>
"""


def render_slides(rows: list[dict]) -> str:
    rows = sorted(rows, key=lambda row: (-(row["top1"] or 0), -(row["ndcg"] or 0), row["regret"] or 999))
    grouped: dict[str, list[dict]] = {}
    for row in rows:
        grouped.setdefault(row["model"], []).append(row)

    best_by_model = sorted(
        [max(items, key=lambda row: row["top1"] or -1) for items in grouped.values()],
        key=lambda row: row["top1"] or -1,
        reverse=True,
    )
    max_top1 = max(row["top1"] or 0 for row in best_by_model) or 1
    max_ndcg = max(row["ndcg"] or 0 for row in best_by_model) or 1
    max_infer = max(row["inference_ms_per_request"] or 0 for row in rows) or 1
    max_train = max(row["train_seconds"] or 0 for row in rows) or 1
    max_size = max(row["model_mb"] or 0 for row in rows) or 1

    winner = rows[0]
    fastest = min(rows, key=lambda row: row["inference_ms_per_request"] if row["inference_ms_per_request"] is not None else 999)
    smallest = min(rows, key=lambda row: row["model_mb"] if row["model_mb"] is not None else 999)
    lightgbm_best = max(grouped["lightgbm_ranker"], key=lambda row: row["top1"] or -1)

    metric_cards = [
        ("Top1", "가장 좋은 후보를 1순위로 뽑은 비율", "높을수록 좋음"),
        ("NDCG@3", "상위 3개 추천 순서가 이상적인 순서와 얼마나 가까운지", "높을수록 좋음"),
        ("Regret", "최고 후보를 놓쳐서 잃은 utility 평균", "낮을수록 좋음"),
        ("Pairwise", "두 후보를 비교했을 때 더 나은 쪽을 맞춘 비율", "높을수록 좋음"),
        ("추론 시간", "요청 1건을 랭킹하는 데 걸린 평균 시간", "낮을수록 좋음"),
        ("자원 사용량", "학습 시간, CPU 시간, Peak RSS, 모델 번들 크기", "낮을수록 배포 부담이 작음"),
    ]
    metric_html = "".join(
        f"<article><b>{esc(name)}</b><p>{esc(desc)}</p><small>{esc(direction)}</small></article>"
        for name, desc, direction in metric_cards
    )

    model_rows = "".join(
        "<tr>"
        f"<td><b>{esc(row['model'])}</b><span>{esc(short_name(row['name']))}</span></td>"
        f"<td>{pct(row['top1'])}{css_bar(row['top1'], max_top1)}</td>"
        f"<td>{fmt(row['ndcg'])}{css_bar(row['ndcg'], max_ndcg)}</td>"
        f"<td>{fmt(row['regret'])}</td>"
        f"<td>{row['inference_ms_per_request']:.2f} ms</td>"
        "</tr>"
        for row in best_by_model
    )

    cost_rows = "".join(
        "<tr>"
        f"<td><b>{esc(short_name(row['name']))}</b><span>{esc(row['model'])}</span></td>"
        f"<td>{row['inference_ms_per_request']:.2f} ms{css_bar(row['inference_ms_per_request'], max_infer, 'cost')}</td>"
        f"<td>{row['train_seconds']:.2f} s{css_bar(row['train_seconds'], max_train, 'cost')}</td>"
        f"<td>{row['model_mb']:.2f} MB{css_bar(row['model_mb'], max_size, 'cost')}</td>"
        f"<td>{row['peak_rss_mb']:.1f} MB</td>"
        "</tr>"
        for row in sorted(rows, key=lambda row: row["inference_ms_per_request"] or 999)[:8]
    )

    model_cards = []
    for model, items in sorted(grouped.items()):
        base = next((row for row in items if row["name"].endswith("_base") or row["name"].endswith("baseline")), items[0])
        best = max(items, key=lambda row: row["top1"] or -1)
        variants = "".join(
            f"<li><b>{esc(short_name(row['name']))}</b><span>{esc(' / '.join(changed_params(row, base)))}</span>"
            f"<em>Top1 {pct(row['top1'])}, NDCG {fmt(row['ndcg'])}</em></li>"
            for row in sorted(items, key=lambda row: row["name"])
        )
        model_cards.append(
            f"<section class='model-card'><h3>{esc(model)}</h3>"
            f"<p>최고: <b>{esc(short_name(best['name']))}</b> · Top1 {pct(best['top1'])}</p>"
            f"<ul>{variants}</ul></section>"
        )

    scatter = []
    for index, row in enumerate(rows):
        x = min(94, max(4, (row["inference_ms_per_request"] or 0) / max_infer * 90 + 4))
        y = 96 - min(90, max(4, (row["top1"] or 0) / max_top1 * 90 + 4))
        label_x = min(88, x + 1.2)
        label_y = max(3, min(94, y + (index % 3 - 1) * 3))
        scatter.append(
            f"<span class='dot {esc(row['model'])}' style='left:{x:.2f}%;top:{y:.2f}%' "
            f"title='{esc(short_name(row['name']))}: Top1 {pct(row['top1'])}, {row['inference_ms_per_request']:.2f}ms'></span>"
            f"<span class='dot-label' style='left:{label_x:.2f}%;top:{label_y:.2f}%'>{esc(plot_label(row['name']))}</span>"
        )
    legend = "".join(f"<span><i class='{esc(model)}'></i>{esc(model)}</span>" for model in sorted(grouped))
    model_cards_first = "".join(model_cards[:4])
    model_cards_second = "".join(model_cards[4:])

    return f"""<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RunStop AI Sweep Slides</title>
<style>
:root{{--ink:#182522;--muted:#64706c;--line:#d9e2de;--paper:#edf2f0;--panel:#fff;--green:#16705d;--teal:#0f8b8d;--blue:#3867d6;--red:#b44747;--amber:#a76c16;--violet:#6b5dd3}}
*{{box-sizing:border-box}}html{{scroll-snap-type:y proximity}}body{{margin:0;background:var(--paper);color:var(--ink);font:18px/1.45 "Segoe UI","Malgun Gothic",Arial,sans-serif}}
.deck{{display:grid;gap:34px;max-width:1240px;margin:0 auto;padding:28px}}
.slide{{min-height:720px;background:var(--panel);border:1px solid var(--line);border-radius:8px;padding:44px 54px;box-shadow:0 14px 40px rgba(24,37,34,.08);overflow:visible;position:relative;scroll-snap-align:start;break-after:page}}
h1,h2,h3,p{{margin-top:0}}h1{{font-size:56px;line-height:1.05;margin-bottom:20px;letter-spacing:0}}h2{{font-size:38px;margin-bottom:22px;letter-spacing:0}}h3{{font-size:24px;margin-bottom:8px;letter-spacing:0}}p{{color:var(--muted)}}small,.slide-muted{{color:var(--muted)}}.kicker{{font-size:15px;color:var(--green);font-weight:700;margin-bottom:12px;text-transform:uppercase}}
.hero-grid{{display:grid;grid-template-columns:1.1fr .9fr;gap:38px;align-items:end;height:100%}}.hero-stat{{display:grid;grid-template-columns:1fr 1fr;gap:14px}}.hero-stat article,.metric-grid article,.callout,.model-card{{border:1px solid var(--line);border-radius:8px;padding:18px;background:#f9fbfa}}
.hero-stat b{{display:block;font-size:28px}}.hero-stat span{{color:var(--muted);font-size:14px}}.metric-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}}.metric-grid b{{font-size:24px}}.metric-grid p{{font-size:15px;margin:8px 0}}.metric-grid small{{font-size:13px}}
.two{{display:grid;grid-template-columns:1fr 1fr;gap:22px}}.three{{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}}.callout b{{display:block;font-size:26px;margin-bottom:8px}}.callout strong{{font-size:40px;color:var(--green)}}
table{{width:100%;border-collapse:collapse;font-size:15px}}th,td{{border-bottom:1px solid var(--line);padding:10px 9px;text-align:left;vertical-align:middle}}th{{font-size:13px;color:var(--muted)}}td b{{display:block}}td span{{display:block;color:var(--muted);font-size:12px;margin-top:2px}}
.slide-bar{{display:block;height:8px;border-radius:99px;background:linear-gradient(90deg,var(--green) var(--w),#e8eeeb var(--w));margin-top:7px}}.slide-bar.cost{{background:linear-gradient(90deg,#7c8792 var(--w),#e8eeeb var(--w))}}
.model-grid{{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}}.model-card h3{{font-size:19px}}.model-card p{{font-size:14px;margin-bottom:8px}}.model-card ul{{list-style:none;padding:0;margin:0;display:grid;gap:6px}}.model-card li{{display:grid;grid-template-columns:1fr 1.2fr .8fr;gap:8px;font-size:12px;align-items:start}}.model-card li span{{color:var(--muted)}}.model-card li em{{font-style:normal;text-align:right;color:var(--green)}}
.scatter{{height:470px;border:1px solid var(--line);border-radius:8px;background:linear-gradient(#edf3f0 1px,transparent 1px),linear-gradient(90deg,#edf3f0 1px,transparent 1px);background-size:20% 25%;position:relative;margin-top:10px}}.scatter:before{{content:"Top1 높음";position:absolute;left:14px;top:10px;color:var(--muted);font-size:13px}}.scatter:after{{content:"추론 시간 증가";position:absolute;right:14px;bottom:10px;color:var(--muted);font-size:13px}}.dot{{width:13px;height:13px;border-radius:50%;position:absolute;transform:translate(-50%,-50%);border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.18)}}.dot-label{{position:absolute;transform:translateY(-50%);font-size:11px;line-height:1;background:rgba(255,255,255,.88);border:1px solid var(--line);border-radius:4px;padding:3px 5px;white-space:nowrap;color:#20302c}}
.condition_score_baseline{{background:#111827}}.lightgbm_ranker{{background:var(--green)}}.xgboost_ranker{{background:var(--amber)}}.catboost_ranker{{background:var(--teal)}}.ranknet{{background:var(--blue)}}.random_forest{{background:var(--red)}}.logistic_regression{{background:var(--violet)}}
.legend{{display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;font-size:12px;color:var(--muted)}}.legend i{{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:-1px}}
.decision{{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}}.decision article{{border-left:5px solid var(--green);background:#f8fbfa;padding:18px}}.decision article:nth-child(2){{border-color:#7c8792}}.decision b{{display:block;font-size:22px;margin-bottom:6px}}
@page{{size:landscape;margin:0}}@media print{{html{{scroll-snap-type:none}}body{{background:#fff}}.deck{{display:block;padding:0}}.slide{{border:0;box-shadow:none;border-radius:0;width:100vw;min-height:100vh}}}}
@media(max-width:900px){{body{{font-size:15px}}.deck{{padding:12px}}.slide{{aspect-ratio:auto;min-height:720px;padding:28px}}h1{{font-size:38px}}h2{{font-size:28px}}.hero-grid,.two,.three,.model-grid{{grid-template-columns:1fr}}.metric-grid{{grid-template-columns:1fr 1fr}}}}
</style>
</head>
<body>
<main class="deck">
<section class="slide">
  <div class="hero-grid">
    <div>
      <div class="kicker">RunStop AI Ranking Sweep</div>
      <h1>모델별 성능과 비용 비교</h1>
      <p>2026-09-15 실험 {len(rows)}개를 발표용으로 재구성했습니다. 줄글 파라미터 대신 모델별 최고안, 비용, 파라미터 영향만 빠르게 보이도록 정리했습니다.</p>
    </div>
    <div class="hero-stat">
      <article><span>최고 성능</span><b>{esc(short_name(winner['name']))}</b><small>Top1 {pct(winner['top1'])}</small></article>
      <article><span>가장 빠름</span><b>{esc(short_name(fastest['name']))}</b><small>{fastest['inference_ms_per_request']:.2f} ms/request</small></article>
      <article><span>가장 작음</span><b>{esc(short_name(smallest['name']))}</b><small>{smallest['model_mb']:.4f} MB</small></article>
      <article><span>운영 후보</span><b>{esc(short_name(lightgbm_best['name']))}</b><small>Top1 {pct(lightgbm_best['top1'])}</small></article>
    </div>
  </div>
</section>

<section class="slide">
  <div class="kicker">Metrics</div>
  <h2>지표 의미</h2>
  <div class="metric-grid">{metric_html}</div>
  <p style="margin-top:18px">MRR은 이번 평가에서 제외했습니다. 실제 사용자 클릭/선택 로그가 아니라 synthetic utility 기반 후보 순위라서, Top1/NDCG/Regret과 의미가 크게 겹칩니다.</p>
</section>

<section class="slide">
  <div class="kicker">Best Per Model</div>
  <h2>모델별 최고 실험 비교</h2>
  <table><thead><tr><th>모델</th><th>Top1</th><th>NDCG@3</th><th>Regret</th><th>추론 시간</th></tr></thead><tbody>{model_rows}</tbody></table>
</section>

<section class="slide">
  <div class="kicker">Quality vs Latency</div>
  <h2>성능과 추론 비용의 위치</h2>
  <div class="scatter">{''.join(scatter)}</div>
  <div class="legend">{legend}</div>
</section>

<section class="slide">
  <div class="kicker">Runtime Cost</div>
  <h2>빠른 순서로 본 자원 소모량</h2>
  <table><thead><tr><th>실험</th><th>추론 시간</th><th>학습 시간</th><th>모델 크기</th><th>Peak RSS</th></tr></thead><tbody>{cost_rows}</tbody></table>
</section>

<section class="slide">
  <div class="kicker">Parameter Sweep</div>
  <h2>모델별 파라미터 변화 영향</h2>
  <div class="model-grid">{model_cards_first}</div>
</section>

<section class="slide">
  <div class="kicker">Parameter Sweep</div>
  <h2>Parameter impact 2</h2>
  <div class="model-grid">{model_cards_second}</div>
</section>

<section class="slide">
  <div class="kicker">Takeaways</div>
  <h2>결론</h2>
  <div class="decision">
    <article><b>순수 성능 우선</b><p>{esc(short_name(winner['name']))}가 Top1 {pct(winner['top1'])}, NDCG@3 {fmt(winner['ndcg'])}로 가장 강합니다. RankNet 계열은 이번 sweep에서 가장 일관되게 높습니다.</p></article>
    <article><b>운영 안정성 우선</b><p>{esc(short_name(lightgbm_best['name']))}는 성능이 RankNet보다 낮지만 모델 크기와 의존성, 해석 가능성 측면에서 운영 후보로 볼 만합니다.</p></article>
  </div>
  <div class="three" style="margin-top:18px">
    <div class="callout"><b>RandomForest</b><p>성능 대비 모델 크기와 학습 시간이 큽니다.</p></div>
    <div class="callout"><b>XGBoost/CatBoost</b><p>이번 단일 파라미터 sweep에서는 이득이 제한적입니다.</p></div>
    <div class="callout"><b>Baseline</b><p>매우 빠르지만 랭킹 품질 차이가 큽니다.</p></div>
  </div>
</section>
</main>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifact-root", default="ai/artifacts")
    parser.add_argument("--output-name", default="20260915_sweep_comparison_report")
    args = parser.parse_args()

    artifact_root = Path(args.artifact_root).resolve()
    output = artifact_root / args.output_name
    output.mkdir(parents=True, exist_ok=True)

    rows = collect_runs(artifact_root)
    if not rows:
        raise SystemExit("No 20260915 sweep artifacts found")

    copy_light_run_files(rows, artifact_root, output)
    (output / "summary.json").write_text(
        json.dumps({"run_count": len(rows), "runs": rows}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (output / "index.html").write_text(render_report(rows), encoding="utf-8")
    (output / "slides.html").write_text(render_slides(rows), encoding="utf-8")

    print(output)
    print(f"{len(rows)} runs")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
