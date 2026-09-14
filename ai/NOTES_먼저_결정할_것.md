# v1 결정 사항과 후속 검증

구현 규격은 docs/CONTRACTS.md, Utility 공식은 docs/UTILITY.md에 정리했습니다.

확정된 초기 규칙:

- 고정 사용자·요청 JSON을 입력으로 사용; 원본 생성기는 별도 유지.
- 후보 최소 6, 목표 8, 최대 10; 초과 시 seed 기반 무작위 축소.
- preference_v1 합성 Utility, dense 동점 순위, 5단계 relevance.
- 선택 기록이 없으므로 selected와 history는 생성하지 않음.
- 사용자 20% Cold 분리, Known 사용자는 마지막 1건 평가·그 앞 1건 검증·나머지 학습.
- insufficient_user=exclude; 실제 제외 배정 보존.
- NDCG 및 Utility 기반 보조 지표, 사용자 cluster bootstrap.
- 입력·설정·모델·artifact 계약을 검증 코드로 강제.

실제 데이터 생성 전에 검토할 사항:

1. Utility 공식의 사용자 선호 근거와 감점 강도.
2. JSON 배열 순서를 과거→미래로 보는 가정의 적절성.
3. 실제 공간 데이터에서의 결측률과 후보 확보율.
4. workers=1부터 처리량/메모리를 측정한 뒤 병렬 수 조절.
5. 필수조건을 Utility 감점으로 둘지 절대 우선순위로 둘지.
6. 학습/운영에서 동일한 특성 규격 유지 및 최종 모델 배포 연결.
