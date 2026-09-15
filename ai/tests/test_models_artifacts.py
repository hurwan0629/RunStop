import importlib.util
import json
from pathlib import Path
import numpy as np
import pytest
from ai.src.config.schema import ExperimentConfig, ModelConfig, SplitConfig, EvaluationConfig, FeatureConfig, UtilityConfig
from ai.src.dataset.splits import split_user_temporal_holdout
from ai.src.dataset.features import select_feature_columns
from ai.src.models.registry import create_model
from ai.src.models.base import BaseRankingModel
from ai.src.experiment.artifacts import sha256_file, write_json
from ai.src.experiment.runner import run_experiment


@pytest.mark.parametrize('name,params,library', [
    ('condition_score_baseline',{},None), ('logistic_regression',{},'sklearn'),
    ('random_forest',{'n_estimators':5},'sklearn'),
    ('lightgbm_ranker',{'n_estimators':5,'min_child_samples':2},'lightgbm'),
    ('xgboost_ranker',{'n_estimators':5},'xgboost'),
    ('catboost_ranker',{'iterations':5},'catboost'),
    ('ranknet',{'epochs':12,'hidden_dim':8,'depth':2,'learning_rate':0.01},'torch')])
def test_tiny_fit_predict_roundtrip(candidates,tmp_path,name,params,library):
    if library and importlib.util.find_spec(library) is None:
        pytest.skip(f'Optional library {library} not installed')
    parts,_ = split_user_temporal_holdout(candidates,SplitConfig())
    columns = select_feature_columns(candidates,FeatureConfig())
    model = create_model(ModelConfig(name=name,params=params),columns)
    model.fit(parts['train'],parts['validation'])
    test=parts['warm_start'].sample(frac=1,random_state=2)
    scores=model.predict_scores(test)
    assert scores.shape == (len(test),) and np.isfinite(scores).all()
    if name == 'condition_score_baseline':
        np.testing.assert_array_equal(scores,test.condition_score)
    else:
        assert np.corrcoef(scores,test.utility)[0,1] > .5
    if name == 'ranknet':
        assert model.history['train_pair_loss'][-1] < model.history['train_pair_loss'][0]
    model.save(tmp_path/'model')
    loaded=BaseRankingModel.load(tmp_path/'model')
    np.testing.assert_allclose(scores,loaded.predict_scores(test))
    # Row order must be preserved even when requests are interleaved.
    reverse=loaded.predict_scores(test.iloc[::-1])
    np.testing.assert_allclose(reverse,scores[::-1],atol=1e-6)


def test_experiment_artifacts_complete_and_failure(candidates,tmp_path):
    dataset=tmp_path/'candidates.parquet'
    candidates.to_parquet(dataset,index=False)
    metadata=tmp_path/'metadata.json'
    write_json(metadata,{'schema_version':1,'status':'complete','version':'test_fixture',
                         'utility':UtilityConfig().model_dump(),'candidates_sha256':sha256_file(dataset)})
    cfg=ExperimentConfig(dataset_path=str(dataset),metadata_path=str(metadata),output_dir=str(tmp_path/'runs'),
                         model=ModelConfig(name='condition_score_baseline'),evaluation=EvaluationConfig(bootstrap_samples=10))
    run=run_experiment(cfg)
    manifest=json.loads((run/'manifest.json').read_text())
    assert manifest['status']=='complete'
    for name in ['config.yaml','environment.json','dataset_reference.json','split_assignments.parquet','predictions.parquet','request_metrics.parquet','model/model.pkl','model/input_schema.json','metrics.json','resource_usage.json','plots/ranking_metrics.png']:
        assert (run/name).is_file() and name in manifest['files']
    assert manifest['files']['model/model.pkl']['sha256']==sha256_file(run/'model/model.pkl')
    # Export must run without relying on the current repository's ai package.
    import subprocess
    import sys
    root=Path(__file__).resolve().parents[2]
    exported=tmp_path/'exported'
    subprocess.run([sys.executable,str(root/'ai/scripts/export_model.py'),'--artifact',str(run),'--output',str(exported)],check=True,capture_output=True)
    subprocess.run([sys.executable,str(exported/'predict.py'),'--input',str(dataset),'--output',str(tmp_path/'predicted.parquet')],cwd=tmp_path,check=True,capture_output=True)
    assert (tmp_path/'predicted.parquet').exists()
    cfg.dataset_path=str(tmp_path/'missing.parquet')
    with pytest.raises(RuntimeError,match='Experiment failed'):
        run_experiment(cfg)
    manifests=[json.loads(p.read_text()) for p in (tmp_path/'runs').glob('*/manifest.json')]
    assert {m['status'] for m in manifests}=={'complete','failed'}
