import json
from pathlib import Path
import pytest
from ai.src.config.schema import GenerationConfig
from ai.src.generation import pipeline
from ai.src.dataset.loader import load_dataset


def test_generation_with_fake_bridge_only(tmp_path,monkeypatch):
    """Exercise assembly/labels/metadata against a fake IPC response, never recommend()."""
    source=tmp_path/'requests.json'
    source.write_text(json.dumps({'users':[{'sample_id':f'u{i}','profile':{'weights':{'distance':5}},
             'requests':[{'route_type':'LOOP','start':[37.5,127.0],'target_km':3.0} for _ in range(3)]} for i in range(2)]}),encoding='utf-8')
    cfg=GenerationConfig(source_json=str(source),expected_users=2,expected_requests=6,
                         routing_worker_dir=str(tmp_path/'worker'),output_dir=str(tmp_path/'dataset'))
    monkeypatch.setattr(pipeline,'preflight',lambda _:[])
    monkeypatch.setattr(pipeline,'spatial_paths',lambda _:[])

    def fake_worker(command,cwd,timeout):
        jobs=json.loads(Path(command[command.index('--jobs')+1]).read_text(encoding='utf-8'))
        target=Path(command[command.index('--output')+1])
        with target.open('w',encoding='utf-8') as stream:
            for job in jobs:
                candidates=[{'candidate_id':f'c{k}','actual_distance_m':3000+k*100,'condition_score':100-k} for k in range(6)]
                stream.write(json.dumps({'request_id':job['request_id'],'status':'ok','candidates':candidates,'attempts':1})+'\n')
    monkeypatch.setattr(pipeline,'run_worker',fake_worker)
    output=pipeline.generate_dataset(cfg)
    frame,metadata,_=load_dataset(output/'candidates.parquet',output/'metadata.json')
    assert len(frame)==36 and metadata['valid_requests']==6
    assert frame.groupby('request_id').ground_truth_rank.min().eq(1).all()
    assert not (tmp_path/'worker').exists()
    with pytest.raises(FileExistsError): pipeline.generate_dataset(cfg)


def test_missing_spatial_data_does_not_create_output(tmp_path,monkeypatch):
    source=tmp_path/'requests.json'
    source.write_text(json.dumps({'users':[{'sample_id':'u1','profile':{'weights':{'distance':5}},'requests':[{'route_type':'LOOP','start':[37,127],'target_km':3}]}]}),encoding='utf-8')
    cfg=GenerationConfig(source_json=str(source),expected_users=1,expected_requests=1,output_dir=str(tmp_path/'never-created'))
    monkeypatch.setattr(pipeline,'preflight',lambda _:['missing.graphml'])
    with pytest.raises(FileNotFoundError): pipeline.generate_dataset(cfg)
    assert not (tmp_path/'never-created').exists()
