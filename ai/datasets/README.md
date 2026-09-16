# Dataset snapshots

`runstop_users_1000_5000_requests.json`은 사용자·요청 원본입니다. 자동 수정하지 않습니다.
`generate_runstop_synthetic_users.py`는 별도 원본 생성기이며 현재 실행 파이프라인에서 import/실행하지 않습니다.

`scripts/generate_dataset.py`를 직접 실행하면 새로운 출력 폴더에 아래 파일을 만듭니다.

```text
candidates_v001/
  candidates.parquet  후보별 수치 특성과 Utility·정답 순위·relevance
  requests.parquet    원본 요청 전체의 정규화 특성, 제외된 요청 포함
  users.parquet       사용자 ID와 profile_json
  metadata.json       상태·입력/공간데이터/코드 해시·Utility·생성 설정·통계
  config.yaml         실제 생성 설정
  failures.json       후보 부족/오류 요청 및 사유
```

출력 디렉터리가 이미 존재하면 거부합니다. 실패한 생성은 status=failed 메타데이터로 남기며 학습 Loader가 거부합니다. Utility를 변경하면 새 버전을 생성합니다. 실제 selected를 가정해서 만들어 넣지 않습니다.

상세 타입·단위는 [계약 문서](../docs/CONTRACTS.md)를 참고하세요.
