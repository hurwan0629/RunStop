import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

test('모든 네이버 지도 경로 overlay는 native map 내부에서 렌더링한다', () => {
  const source = readFileSync(new URL('../src/features/course/components/CourseMap.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('CourseMap.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let overlays = 0;
  function visit(node) {
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(tree) === 'NaverMapPathOverlay') {
      overlays++;
      let parent = node.parent;
      while (parent && !(ts.isJsxElement(parent) && parent.openingElement.tagName.getText(tree) === 'NaverMapView')) {
        parent = parent.parent;
      }
      assert.ok(parent, `지도 밖의 경로 overlay: ${node.getText(tree)}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  assert.ok(overlays >= 3, '추천·실제 GPS·선택 구간 경로가 있어야 함');
});
