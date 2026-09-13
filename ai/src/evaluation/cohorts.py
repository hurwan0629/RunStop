def evaluation_cohorts(parts):
    return {name: parts[name] for name in ("warm_start", "cold_start")}
