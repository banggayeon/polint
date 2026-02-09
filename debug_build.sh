set -euo pipefail

POLICY_ID="${1:-P-c3b4960f}"

echo "==[0] compose 서비스 상태=="
docker compose ps || true
echo

echo "==[1] nginx(web) 통해서 build를 'POST'로 호출 (프론트와 동일)=="
echo "URL: http://localhost/api/v1/policies/${POLICY_ID}/build"
curl -sS -D /tmp/h1.txt -o /tmp/b1.txt \
  -X POST "http://localhost/api/v1/policies/${POLICY_ID}/build" \
  -H "Content-Type: application/json" || true
echo "--- response headers ---"
cat /tmp/h1.txt || true
echo "--- response body (first 800 chars) ---"
head -c 800 /tmp/b1.txt 2>/dev/null || true; echo
echo

echo "==[2] spring 직접 호출(nginx 우회) - POST=="
echo "URL: http://localhost:8080/v1/policies/${POLICY_ID}/build"
curl -sS -D /tmp/h2.txt -o /tmp/b2.txt \
  -X POST "http://localhost:8080/v1/policies/${POLICY_ID}/build" \
  -H "Content-Type: application/json" || true
echo "--- response headers ---"
cat /tmp/h2.txt || true
echo "--- response body (first 800 chars) ---"
head -c 800 /tmp/b2.txt 2>/dev/null || true; echo
echo

echo "==[3] web 컨테이너에서 spring health 체크 (nginx->spring 네트워크 확인)=="
docker compose exec -T web sh -lc 'echo "curl http://spring:8080/v1/health"; curl -sS -i http://spring:8080/v1/health | head -n 30' || true
echo

echo "==[4] spring 컨테이너에서 agent 연결 체크 (spring->agent 네트워크 확인)=="
docker compose exec -T spring sh -lc 'echo "curl http://agent:8000/docs"; curl -sS -i http://agent:8000/docs | head -n 20' || true
echo

echo "==[5] 최근 로그 요약: web/spring/agent=="
echo "--- web (last 50) ---"
docker compose logs -n 50 web || true
echo
echo "--- spring (last 120) ---"
docker compose logs -n 120 spring || true
echo
echo "--- agent (last 200) ---"
docker compose logs -n 200 agent || true
echo

echo "==[결론 힌트]=="
echo "1) [1]이 502인데 [2]는 200/500이면 -> nginx 레이어 문제(프록시/타임아웃 등)"
echo "2) [2]가 5xx면 -> spring 내부 문제(대부분 agent 호출 실패). agent 로그 확인"
echo "3) agent 로그에 404 model / API key / stacktrace가 있으면 -> agent 내부 문제"
