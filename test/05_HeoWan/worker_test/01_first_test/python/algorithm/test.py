import time
import sys
import random
import json
from json import JSONDecodeError

def test1():
  """동시성 테스트"""
  for i in range(3):
    time.sleep(3)
    # 파이썬 프로세스 버퍼에 "hello"를 출력해놓고 
    # flush=True를 통해 즉시 stdout(fd[1])로 flush 해두기
    #  -> 최종적으로 Node의 python.stdout(fd[4])에서 받게됨 
    #     (0, 1, 2가 노드 표준, 3, 4, 5가 파이썬 표준이라는 가정 하에)
    print("hello", flush=True, end="")

def test_recover():
  """파이썬에서 에러가 날 경우 처리하는 것에 대한 테스트"""
  err_count = 0
  for line in sys.stdin:
    try:
      # \r, \n, 공백 제거
      line = line.strip()

      # 내용이 없으면 pass
      if not line: 
        continue  
        
      # 에러 재현
      if random.random() >= 0.5:
        err_count+=1

        # 비정상 감지 예시
        if err_count > 3:
          print("not normal", flush=True, end="")    
          # 프로세스 자체를 꺼버리기 (code: 1)
          sys.exit(1)

        raise Exception(f"error occured: {err_count}")

      # 받았음을 나타내기
      print(line + " recieved", flush=True, end="")
    except Exception as e:
      print(e, flush=True, end="")


def test_json():
  """Node에서 python.stdin에 json 직렬화를 주는 경우에 이것을 받는 테스트"""
  for line in sys.stdin:
    line = line.strip()

    line_parse: dict = {}
    
    try:
      line_parse: dict = json.loads(line)
    except TypeError:
      print("request must be json. request:" + str(line), flush=True, end="")
      continue
    except JSONDecodeError as e:
      print("JSON Format Error:" + str(line), flush=True, end="")
      continue

    line_parse["created_by_python"] = " ".join([
      str(value) for value in line_parse.values()
    ])

    print(json.dumps(line_parse), flush=True, end="")

    