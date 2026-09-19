import assert from 'node:assert/strict';
import test from 'node:test';
import { ApiRequestError, getRecommendationFailure } from '../src/services/api/errors.ts';

test('실패 이유별로 조건 수정·재시도·로그인 행동을 선택한다', () => {
  for (const [status, code, action] of [
    [422, 'ROUTE_CANDIDATES_NOT_FOUND', 'edit'],
    [422, 'ROUTING_INPUT_REJECTED', 'edit'],
    [504, 'ROUTING_WORKER_TIMEOUT', 'retry'],
    [503, 'ROUTING_WORKER_UNAVAILABLE', 'retry'],
    [502, 'INVALID_ROUTING_WORKER_RESPONSE', 'retry'],
    [401, 'TOKEN_EXPIRED', 'login'],
  ]) {
    const result = getRecommendationFailure(new ApiRequestError(status, code, 'internal text'));
    assert.equal(result.action, action);
    assert.ok(result.message.length > 10);
    assert.ok(!result.message.includes('internal text'));
  }
});

test('원인이 확인되지 않은 오류는 특정 조건 탓으로 단정하지 않는다', () => {
  assert.match(getRecommendationFailure(new Error('private trace')).message, /정확한 원인/);
  assert.match(getRecommendationFailure(new TypeError('Network request failed')).message, /인터넷 연결/);
});
