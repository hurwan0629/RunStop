def evaluation_cohorts(parts):
    """평가에 사용하는 warm_start/cold_start split만 꺼냅니다."""
    return {name: parts[name] for name in ("warm_start", "cold_start")}
