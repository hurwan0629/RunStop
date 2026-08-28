# [데이터베이스] PostGIS 확장 사용
> PostGIS에서 어떤 기능을 제공하는지와 문법에 대해서 알아보았습니다.

## 1. 도커로 PostGIS Extention이 달린 컨테이너 돌리기
현재 컴퓨터에 `PostgreSQL` 프로그램이 설치되어있지 않기 때문에 도커를 이용하여 `postgis/postgis:17-3.5` 버전을 받았습니다.

[도커 컨테이너 띄우기](../image.png)

명령어는 아래를 그대로 사용하였습니다.

```bash
docker run --name postgis-test -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=runstop -p 5432:5432 -d postgis/postgis:17-3.5
```