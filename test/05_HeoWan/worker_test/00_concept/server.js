// server.js

// 노드 모듈인 child_process 가져오기
const { spawn } = require("child_process");

// 파이썬 프로세스 생성하기 (Node stdin으로 커널에 생성 요청)
const python = spawn("python", ["worker.py"]);

// 프로세스 이벤트 설정
python.stdout.on("data", (data) => {
  console.log("Python 응답:", data.toString());
});

python.stderr.on("data", (data) => {
  console.error("Python 오류:", data.toString());
});

// 예시 요청
python.stdin.write(
  JSON.stringify({
    requestId: 1,
    targetDistanceKm: 5
  }) + "\n"
);

python.stdin.end();