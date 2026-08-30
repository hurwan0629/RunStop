// 자식 프로세스를 생성해주는 child_process 모듈의 함수
import { spawn } from "child_process"
import { workerData } from "worker_threads"

// # Node stdin에 `python ../python/worker.py`를 입력해주어 프로세스 생성
//  [이때 일어나는 일들]
// - 파이썬 프로세스 생성
// - 파이썬 프로세스에 fd[0, 1, 2] 생성
// - Node에 파이썬의 fd[0, 1, 2] 생성
const pythonWorker = spawn("python", ["../python/worker.py"])

// # [파이썬 이벤트 등록]

// ## 1. 파이썬 출력 fd[1]가 바라보는 버퍼 메모리를 구독하기
pythonWorker.stdout.on("data", (data) => {
  // 기본적으로 파이프/버퍼에는 byte stream인 Buffer 객체가
  // 존재하기 때문에 .toString()로 바꿔주기
  console.log("[Python Worker] [onData]:", data.toString())
})

// ## 2. 파이썬 에러 출력 fd[2]가 바라보는 버퍼 메모리를 구독하기
pythonWorker.stderr.on("data", (data) => {
  console.log("[Python Worker] [onError]:", data.toString())
})

// ## 3. 파이썬 프로세스 종료 감지하기
pythonWorker.on("close", (code) => {
  // 종료 코드를 출력해주기
  // code: number이며 signal로 종료되면 null이 될 수 있음
  //   0: 정상 종료
  //   1: 오류 종료
  //   2+: 프로그램에서 원하는데로 정의
  console.log("[Python Worker] [onClose]:", code)
})

// 파이썬 프로세스 객체의 fd[0]의 pipe buffer에 write(fd[0], 내용) 하기
pythonWorker.stdin.write("hello\n")

const wait = async function(time) {
  await new Promise(resolve => {
    setTimeout(() => resolve(), time*1000)
  })
}

for(let i=0;i<10;i++) {
  await wait(1)
  
  // pythonWorker.stdin.write("message\n")
  if(Math.random() >= 0.7) {
    pythonWorker.stdin.write(Buffer.from([1]))
    pythonWorker.stdin.write("\n")
  } 
  else if(Math.random() >= 0.4) {
    pythonWorker.stdin.write("{ads, f: dfs}\n")
  }
  else {
    const request = {
      "node_a": "something",
      nodeb: "second",
      nodec: 341.23
    }
    pythonWorker.stdin.write(JSON.stringify(request) + "\n")
  }


  console.log("[Node] healthcheck")
}

pythonWorker.stdin.end()

// process.exit()