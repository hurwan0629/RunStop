"""Bootstrap must preserve repeated requests within each user."""
import pandas as pd
from ai.src.metrics.ranking import confidence_interval


def test_cluster_bootstrap_reproducibility_and_missing_cases():
    frame=pd.DataFrame({'user_id':['a','a','b','b'],'score':[0.0,0.0,1.0,1.0]})
    ci=confidence_interval(frame,'score',200,.95,42)
    assert ci == confidence_interval(frame,'score',200,.95,42)
    assert ci == [0.0,1.0]
    assert confidence_interval(frame.iloc[:2],'score',200,.95,42) is None
    assert confidence_interval(frame,'score',0,.95,42) is None
