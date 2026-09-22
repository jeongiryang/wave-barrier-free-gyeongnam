# 나루 로컬 모델 이중화 작업 로그

- 목적: 반환한 DSW GPU를 재점유하지 않고 TITAN RTX LM Studio를 주 서버, 4070 Ti Ollama를 예비 서버로 운영한다.
- 사람: 장비 제공·주/예비 배치 결정, Tailscale 로그인, 필요한 sudo 설정 실행.
- AI: SSH/API 검증, LM Studio 사진/구조화 출력 어댑터, 제한된 서버 장애 전환, Windows 사용자 런타임 복구, 합성 모델 검증, PR 준비.
- 검증: Node 전체 1,635개, Python 7개, typecheck/build/performance 성공. lint 오류 없음(기존 경고 25개). 최종 변경 후 assistant 19개와 Python 7개 재통과.
- 실제 모델: 주/예비 HTTPS 각각 합성 8개 통과. 주 gateway 중지 후 예비 응답 1.74초, 주 gateway 복구 확인.
- 제한: 작은 합성 표본이며 동등한 모델 품질이나 모든 동시 부하를 보장하지 않는다. CI/CD·Production 적용 결과는 PR과 후속 운영 기록에서 확인한다. 재부팅 후 무인 복구는 별도 검증이 필요하다.
- 비밀값과 실제 사용자 대화는 커밋하지 않는다. 자세한 실행 상태는 docs/naru-4070-temporary-20260921.md 참조.
