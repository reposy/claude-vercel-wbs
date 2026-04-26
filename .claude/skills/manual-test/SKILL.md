---
name: manual-test
description: PR 검증을 위해 사용자가 손으로 클릭할 환경(서버 + 헤드풀 크롬)을 한 번에 셋업하고 사용자에게 인계하는 워크플로우. Playwright 자동 클릭은 사용 X — 사용자 눈과 손이 검증의 본진. 풀 사이클 d 단계로 사용.
---

# manual-test

PR 검증을 위해 **사용자가 손으로 클릭할 환경을 셋업하고 인계**하는 스킬. Playwright 자동 클릭은 의도적으로 쓰지 않는다.

## 언제 사용

무거운 PR의 사용자 검증 단계 (풀 사이클 d). 자동 검증(`multi-agent-review` 등)을 통과한 PR을 사용자가 직접 클릭해서 마지막으로 확인할 때.

## 본질

사용자가 손으로 클릭할 환경을 한 번에 셋업하고 인계한다. **Playwright 자동 클릭은 의도적으로 쓰지 않는다** — JS synthetic click이 hit-test를 우회해 실제 사용자 동선과 다른 경로를 타기 때문(PR #17 거짓 양성 사례). 본인 눈으로 보고 본인 손으로 클릭이 본질.

## 선행 조건

- 검증 대상 PR 브랜치가 푸시된 상태 (PR 번호 또는 브랜치명)
- 별도 워크트리 또는 검증 디렉토리 (메인 작업 디렉토리와 분리 권장 — 메인 컨텍스트 안 섞이게)
- supabase 컨테이너가 떠 있거나 사용자 본인이 띄울 의지

## 절차

### 1. PR 정보

사용자에게 PR 번호 또는 브랜치명을 묻는다. 받은 정보로 체크아웃:

- PR 번호 → `gh pr checkout <num>`
- 브랜치명 → `git fetch && git switch <branch>`

### 2. 검증 디렉토리

메인 작업 디렉토리에서 진행할지, 별도 워크트리에서 진행할지 사용자에게 묻는다. 별도 워크트리 권장 (메인 작업 컨텍스트 격리 — 진행 중인 다른 브랜치 영향 없음). 워크트리 사용 시:

```bash
git worktree add ../wbs-manual-test <branch>
cd ../wbs-manual-test
```

### 3. 의존성

PR이 `package-lock.json`을 변경했으면 `npm install` 실행 안내 (사용자 승인 후). 변경 안 했으면 스킵.

### 4. .env.local

검증 디렉토리에 `.env.local`이 없으면 메인 작업 디렉토리에서 복사 안내 (자동 복사 X — 사용자가 직접):

```bash
cp ../claude-vercel-wbs/.env.local .env.local
```

### 5. supabase 컨테이너

`docker ps`로 `supabase_db_<project>` 떠 있는지 확인. 안 떠 있으면 `supabase start` 안내 (사용자 승인 후 실행).

### 6. dev 서버

메인 세션의 dev 서버와 PORT 충돌 방지. 사용자에게 두 옵션 제시:

- 검증용 dev를 다른 PORT로: `PORT=3001 npm run dev`
- 메인 dev 끄기: 메인 세션에서 `kill %1` 또는 `pkill -f 'next dev'`

선택받은 후 `run_in_background: true`로 띄우고 5초 이내 `Local: http://localhost:<port>` 또는 `ready` 라인이 나오는지 확인.

### 7. 헤드풀 크롬

Playwright MCP의 `browser_navigate`로 `http://localhost:<port>`에 띄운다 (OS 기본 브라우저 `open`/`xdg-open`은 사용 X). 이렇게 하면 사용자 검증 후 "X가 안 됐어" 보고 시 같은 브라우저 컨텍스트에서 추가 진단(예: `browser_evaluate`로 DOM 검사)이 가능 — PR #17 같은 거짓 양성 회피의 보조 수단.

### 8. 사용자 인계

다음 한 단락을 보여주고 인계:

> ✅ 준비 완료. 다음 J 시나리오를 직접 클릭해주세요. 모두 끝나고 결과 알려주세요.
> - dev 서버: http://localhost:<port>
> - 헤드풀 크롬: 별도 창으로 띄워둠 (직접 클릭 가능)
> - 검증할 J 시나리오: <PR plan에서 가져오거나 사용자가 명시>

J 시나리오 명단은 PR plan 또는 사용자 판단으로 결정. 본 스킬은 명단을 강제하지 않는다. **헤드풀 크롬은 종료시키지 않는다** — 사용자가 검증 끝낼 때까지 유지.

### 9. 정리 단계 (별도 호출 시에만)

사용자가 "manual-test 정리해줘" / "dev 서버 꺼줘" 등의 **자연어로 정리 요청 시** 본 단계를 실행한다. 슬래시 변형 만들지 않는다 — 단일 슬래시 `/manual-test`는 셋업 진입에만 사용 (자연어로 충분).

정리 동작:
- 검증용 dev 서버 백그라운드 종료 (`kill %<id>` 또는 `pkill -f 'next dev'`)
- 헤드풀 크롬 닫기 (`mcp__playwright__browser_close`)
- 별도 워크트리 사용했다면 정리 안내: `git worktree remove ../wbs-manual-test`

**자동 정리 X** — 검증이 끝났는지는 사용자만 안다. 사용자가 명시 호출할 때까지 모두 유지.

## 규칙

- Playwright의 `browser_click` / `browser_type` / `browser_evaluate("...click()")` 등 **자동 동선 호출 X**. 단순 `browser_navigate`로 띄우는 것만. 단, 사용자가 검증 후 "X가 안 됐어" 보고하면 그 시점에 진단용으로 `browser_evaluate`로 DOM 검사는 OK
- `npm install` / `supabase start` / `npm run dev` / 종료 명령 모두 **사용자 승인 후** 실행
- **별도 워크트리 사용 권장** (메인 작업 컨텍스트 격리)
- **자동 정리 X** — 사용자가 자연어로 정리 요청할 때만
- 한국어 안내
