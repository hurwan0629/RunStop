# worker.py
# 
# 우리가 만들 알고리즘이 들어간 실시간으로 켜져있을 워커
# 
from algorithm import test1, test_recover, test_json

# action = test1
# action = test_recover
action = test_json

action()


print("process end")
