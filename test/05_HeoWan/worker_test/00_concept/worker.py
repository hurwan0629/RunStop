# worker.py
import sys
import json


def handle_request(request):
    print("처리 중...", file=sys.stderr)

    return {
        "requestId": request["requestId"],
        "routes": [
            {"distanceKm": request["targetDistanceKm"]}
        ]
    }


if __name__ == "__main__":
    for line in sys.stdin:
        # 데이터를 \n 기준으로 가져오기
        request = json.loads(line)

        # 가져온 데이터에서 requestId와 targetDistanceKm 뽑아주기
        result = handle_request(request)

        # stdout로 내보내주기
        print(json.dumps(result), flush=True)