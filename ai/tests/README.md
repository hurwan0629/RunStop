# 검증

`python -m pytest ai/tests -q`는 작은 가상 데이터로 아래를 검사합니다.

- 모델별 설정 검증 및 YAML 왕복, JSON 두 규격 정규화
- Utility와 기존 점수의 독립성, 동점 순위, 정답 규격
- 사용자·요청 분할 누출 방지와 재현성
- 지표의 알려진 정답, 가변 후보 수
- 모델 7종의 작은 fit/predict, 행 순서 보존, 저장·복원
- artifact 성공/실패 기록, 독립 export 추론
- 가짜 워커 응답을 통한 임시 Parquet 조립, 기존 출력 거부
- 로컬 API의 검증·저장·불러오기·경로 제한, 실행 API 부재

선택 모델 라이브러리가 없으면 해당 모델 테스트만 skip됩니다. 5,000건 JSON은 읽기 검증만 하며 실제 recommend()는 호출하지 않습니다. 테스트 Parquet과 모델은 OS 임시 폴더에 생성합니다.

`python ai/scripts/check_ui.py`는 headless Edge에서 모델별 폼, YAML 저장/복원, 입력 오류, Utility 수정, 모바일 overflow를 검사합니다. 설정은 임시 폴더, 화면 캡처는 ai/artifacts/ui-check에 저장합니다.
