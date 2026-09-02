# Infra 함수

Infra는 DB 연결, 트랜잭션 같은 기술 기반을 담당합니다.

## DB Pool

### `createPool(): Pool`

- 인자 DTO: 없음
- 반환값: `pg.Pool`
- 작업 내용:
  - `env.DATABASE_URL`을 사용해서 PostgreSQL Pool을 생성합니다.

### `getPool(): Pool`

- 인자 DTO: 없음
- 반환값: singleton `pg.Pool`
- 작업 내용:
  - 이미 생성된 Pool이 있으면 재사용합니다.
  - 없으면 `createPool()`로 새 Pool을 생성합니다.

### `closePool(): Promise<void>`

- 인자 DTO: 없음
- 반환값: 없음
- 작업 내용:
  - singleton Pool을 종료합니다.
  - 종료 후 내부 참조를 비웁니다.

## Transaction

### `withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T>`

- 인자 DTO: `PoolClient`를 받는 비동기 작업 함수
- 반환값: 작업 함수의 반환값 `T`
- 작업 내용:
  - Pool에서 client를 가져옵니다.
  - `BEGIN`을 실행합니다.
  - 작업 성공 시 `COMMIT`합니다.
  - 작업 실패 시 `ROLLBACK`합니다.
  - 마지막에 client를 release합니다.
