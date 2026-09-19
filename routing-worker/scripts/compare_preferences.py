"""동일 출발지의 조건별 전체 후보 / AI Top 3를 JSON·CSV로 비교한다.

예: python scripts/compare_preferences.py --output results/baseline --variants any,gentle,rolling
실제 사용자 선택은 --selected JSON 파일의 {case_id: candidate_id}로만 기록한다.
"""
import argparse
import contextlib
import csv
import hashlib
import io
import json
from pathlib import Path
import statistics
import sys
from time import perf_counter, process_time
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.algo._datapaths import DATA_ROOT
from src.algo import pipeline
from src.algo import config
from src.algo.utils.graph import NodeIndex, load_graph


def metrics(candidate):
    row = {key: candidate.get(key) for key in (
        "actual_distance_m", "distance_error_pct", "overlap_ratio", "condition_score", "ai_score",
        "ranking_source", "generation_source",
    )}
    row["candidate_id"] = hashlib.sha256(json.dumps(candidate["coords"]).encode()).hexdigest()[:16]
    for group in ("slope", "facilities", "nature", "surface"):
        row.update({f"{group}_{key}": value for key, value in candidate.get(group, {}).items()
                    if value is None or isinstance(value, (float, int))})
    scores = candidate.get("sub_scores", {})
    row["night_score"] = statistics.mean([scores.get("streetlight", 0), scores.get("cctv", 0)])
    return row


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--variants", default="any,gentle,rolling,nature,flow,toilet,store,night")
    parser.add_argument("--origins", type=int, default=3)
    parser.add_argument("--distance", type=float, default=3)
    parser.add_argument("--route-type", choices=["LOOP", "ONE_WAY", "ROUND_TRIP"], default="LOOP")
    parser.add_argument("--selected", type=Path)
    parser.add_argument("--rolling-target", type=float)
    parser.add_argument("--guided-budget", type=int, default=8)
    parser.add_argument("--via", type=float, nargs=2, action="append", default=[])
    parser.add_argument("--summarize-only", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.origins <= 3 or args.distance <= 0 or args.guided_budget < 0:
        parser.error("origins must be 1..3, distance positive, guided-budget nonnegative")
    if args.rolling_target is not None:
        if args.rolling_target <= 0:
            parser.error("rolling-target must be positive")
        config.ROLLING_TARGET_SLOPE_PCT = args.rolling_target
    if args.summarize_only:
        results = json.loads(args.output.with_suffix(".json").read_text(encoding="utf-8"))
        write_reports(results, args.output)
        return
    graph = load_graph(DATA_ROOT / "서울_보행네트워크.graphml")
    index = NodeIndex(graph)
    # 같은 세 출발점을 모든 조건에 재사용한다. 도시·하천·경사지 주변 표본.
    origins = [(37.571806, 127.011287), (37.5133, 127.0590), (37.5563, 126.9723)][:args.origins]
    choices = json.loads(args.selected.read_text(encoding="utf-8")) if args.selected else {}
    results = []
    output = args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    selector = pipeline.select_candidates_with_ai

    for origin_index, start in enumerate(origins):
        for variant in args.variants.split(","):
            weights = {"distance": 3, "elevation": 0, "nature": 0, "park": 0, "flow": 0, "night": 1}
            requirements = {}
            facilities = {"toilet": "IGNORE", "store": "IGNORE"}
            if variant in ("gentle", "rolling"):
                weights["elevation"] = 5
                requirements.update(max_slope_pct=5 if variant == "gentle" else 8,
                                    slope_preference="GENTLE" if variant == "gentle" else "NORMAL")
            elif variant == "nature":
                weights.update(nature=5, park=5)
            elif variant == "flow":
                weights["flow"] = 5
            elif variant in facilities:
                facilities[variant] = "PREFER"
            elif variant == "night":
                weights["night"] = 5
            elif variant != "any":
                raise ValueError(f"Unknown variant: {variant}")

            pool = []
            selected_ids = set()

            def capture(candidates, *positional, **kwargs):
                selected = selector(candidates, *positional, **kwargs)
                pool.extend(metrics(candidate) for candidate in candidates)
                selected_ids.update(metrics(candidate)["candidate_id"] for candidate in selected)
                return selected

            case_id = f"{origin_index}:{variant}:{args.route_type}:{args.distance}"
            started = perf_counter()
            cpu_started = process_time()
            with patch.object(pipeline, "select_candidates_with_ai", capture), contextlib.redirect_stdout(io.StringIO()):
                end = (start[0], start[1] + 0.01) if args.route_type == "ONE_WAY" else None
                pipeline.recommend(graph, index, args.route_type, start, args.distance, end=end,
                                   vias=[tuple(point) for point in args.via], guided_budget=args.guided_budget,
                                   weights=weights, requirements=requirements, facility_preferences=facilities)
            elapsed = round(perf_counter() - started, 3)
            cpu_seconds = round(process_time() - cpu_started, 3)
            for row in pool:
                row.update(case_id=case_id, variant=variant, origin=origin_index,
                           top3=row["candidate_id"] in selected_ids,
                           user_selected=row["candidate_id"] == choices.get(case_id))
            results.append({"case_id": case_id, "variant": variant, "start": start, "elapsed_seconds": elapsed,
                            "cpu_seconds": cpu_seconds,
                            "end": end, "vias": args.via, "guided_budget": args.guided_budget,
                            "rolling_target": config.ROLLING_TARGET_SLOPE_PCT,
                            "weights": weights, "requirements": requirements, "facilities": facilities,
                            "pool": pool, "top3_count": len(selected_ids)})
            output.with_suffix(".json").write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"{case_id}: {len(pool)} candidates / {len(selected_ids)} selected / {elapsed}s", flush=True)

    write_reports(results, output)


def write_reports(results, output):

    rows = [row for result in results for row in result["pool"]]
    if rows:
        with output.with_suffix(".csv").open("w", encoding="utf-8-sig", newline="") as stream:
            writer = csv.DictWriter(stream, fieldnames=sorted({key for row in rows for key in row}))
            writer.writeheader()
            writer.writerows(rows)

    summary = {}
    for variant in dict.fromkeys(result.get("variant", result["case_id"].split(":")[1]) for result in results):
        cases = [result for result in results if result.get("variant", result["case_id"].split(":")[1]) == variant]
        summary[variant] = {"case_count": len(cases), "empty_pool_count": sum(not case["pool"] for case in cases)}
        for stage in ("pool", "top3", "user_selected"):
            subset = [row for row in rows if row["variant"] == variant and (stage == "pool" or row[stage])]
            values = {}
            for key in {key for row in subset for key, value in row.items() if type(value) in (int, float)}:
                numbers = [row[key] for row in subset if type(row.get(key)) in (int, float)]
                values[key] = {"mean": statistics.mean(numbers), "median": statistics.median(numbers),
                               "min": min(numbers), "max": max(numbers)}
                # 후보 수가 많은 출발점에 평균이 치우치는지 별도로 확인할 수 있게 한다.
                origin_means = {str(origin): statistics.mean(row[key] for row in subset
                                if row["origin"] == origin and type(row.get(key)) in (int, float))
                                for origin in {row["origin"] for row in subset if type(row.get(key)) in (int, float)}}
                values[key]["origin_means"] = origin_means
                values[key]["mean_of_origin_means"] = statistics.mean(origin_means.values())
            summary[variant][stage] = {"count": len(subset), "metrics": values}
    output.with_suffix(".summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
