---
name: setup-dev-environment
description: WBS 과제의 로컬 개발 환경을 진단하고 누락된 의존성(Docker·Supabase CLI·Vercel CLI·Node 등) 설치와 Supabase/Vercel 회원가입·로그인 방법을 단계별로 안내합니다. 수강생이 저장소를 막 클론했거나 "환경 세팅", "setup", "dev environment"를 언급할 때 사용합니다. 자동 설치는 하지 않고 사용자 승인을 받은 뒤 명령을 제안만 합니다.
---

# setup-dev-environment

이 스킬은 WBS 과제를 따라 하려는 수강생의 로컬 환경이 준비됐는지를 점검하고, 빠진 부분만 골라 가이드를 주기 위한 것이다. **설치를 직접 실행하지 말 것.** 항상 수강생에게 "아래 명령을 실행할까요?"라고 물은 뒤 승인된 명령만 실행한다.

## 전제

- 수강생은 이미 Claude Code와 `gh` CLI는 설치·로그인한 상태다(2회 오프라인 Claude Code 세션 수료 기준).
- 아래 항목은 **없을 가능성이 높다**: Docker Desktop, Supabase CLI, Vercel CLI, Supabase 계정, Vercel 계정.

## 절차

### 1. 진단 (병렬 실행)

다음 Bash 명령을 **단일 메시지에서 병렬로** 실행해 현재 상태를 수집한다.

- `uname -s` (OS 감지: Darwin / Linux / MINGW*·MSYS*)
- `node -v`
- `npm -v`
- `docker --version`
- `docker info` (데몬 기동 여부까지 확인; 실패해도 OK, 결과에서 판단)
- `supabase --version`
- `vercel --version`
- `gh auth status`

결과를 아래 형식의 표로 수강생에게 보여준다.

| 도구 | 상태 | 비고 |
|---|---|---|
| Node.js | ✅ / ⚠️ / ❌ | 버전 표시. 20 미만이면 ⚠️ |
| Docker Desktop | ✅ / ⚠️ / ❌ | 설치됐지만 데몬 꺼져 있으면 ⚠️ |
| Supabase CLI | ✅ / ❌ | |
| Vercel CLI | ✅ / ❌ | |
| GitHub CLI 로그인 | ✅ / ⚠️ | 로그아웃이면 ⚠️ |

범례: ✅ 사용 가능 / ⚠️ 설치됐지만 추가 조치 필요 / ❌ 설치 안 됨.

### 2. 누락 항목 설치 안내

진단 결과에서 `❌`/`⚠️` 행에 대해서만 OS별 명령을 제안한다. 한 번에 한 도구씩, 수강생에게 "아래 명령을 실행할까요?"로 승인을 요청하고, 승인된 것만 실행한다.

**macOS (Darwin)**

- Node.js: `brew install node@20`
- Docker Desktop: 설치 명령으로 자동화하지 않는다. 공식 다운로드 링크 안내: https://www.docker.com/products/docker-desktop/ (설치 후 앱을 실행해 고래 아이콘이 상단 바에 뜨는지 확인).
- Supabase CLI: `brew install supabase/tap/supabase`
- Vercel CLI: `npm i -g vercel`

**Windows (MINGW/MSYS/Cygwin 또는 안내로 PowerShell)**

- Node.js: `winget install OpenJS.NodeJS.LTS`
- Docker Desktop: https://www.docker.com/products/docker-desktop/ (WSL2 활성화 필요)
- Supabase CLI: `scoop install supabase` 또는 https://supabase.com/docs/guides/local-development/cli/getting-started
- Vercel CLI: `npm i -g vercel`

**Linux**

- Node.js: nvm 또는 배포판 패키지 매니저 (예: Ubuntu → NodeSource 스크립트 링크)
- Docker: https://docs.docker.com/engine/install/ (배포판별 공식 스크립트)
- Supabase CLI: https://supabase.com/docs/guides/local-development/cli/getting-started (tar.gz 다운로드 또는 Homebrew on Linux)
- Vercel CLI: `npm i -g vercel`

### 3. 계정 가입·로그인 안내

순서대로 진행:

1. **Supabase 계정**
   - 가입: https://supabase.com/dashboard/sign-up (GitHub 로그인 권장 — 수강생 계정과 묶이면 편함)
   - CLI 로그인: `supabase login` (브라우저가 열려 개인 액세스 토큰을 발급받고 붙여넣음)
2. **Vercel 계정**
   - 가입: https://vercel.com/signup (GitHub 로그인 권장)
   - CLI 로그인: `vercel login` (이메일 또는 GitHub 선택)
3. **GitHub CLI**
   - 이미 로그인된 전제이나, `gh auth status`가 실패하면 `gh auth login` 안내.

### 4. 유용한 유틸 (선택, 강제 X)

수강생이 원할 때만 제안한다. "필요 없으면 건너뛰세요" 한 줄과 함께.

- VS Code / Cursor 확장:
  - `Chakra UI Snippets` — Chakra UI 컴포넌트 스니펫
  - `Supabase` (`Supabase.supabase`) — 로컬 Studio 연동
  - `GitHub Actions` (`GitHub.vscode-github-actions`) — `db-migrate.yml` 편집 시 자동완성/검증
  - `ESLint`, `Prettier`
  - ⚠️ Prisma 확장은 추천하지 않습니다 (이 프로젝트는 Drizzle을 사용).
- CLI 유틸: `jq` (JSON 파싱), `httpie` (REST 디버깅)

### 5. 마무리

모든 필수 도구 상태가 ✅가 되면 스킬을 종료하면서 수강생에게 다음 질문을 던진다.

> ✅ 환경 점검 완료. 이어서 **`/dev-server`** 스킬로 로컬 Supabase 컨테이너와 Next.js 개발 서버를 기동할까요? (네/아니요)

- "네" → `dev-server` 스킬을 호출.
- "아니요" → README의 "로컬 개발 시작하기" 섹션을 직접 참고하라고 안내만 하고 종료.

## 규칙

- 이 스킬은 **파일을 쓰거나 편집하지 않는다**. 진단·제안·명령 실행(수강생 승인 후)만.
- 설치 명령은 **한 번에 하나씩** 승인받아 실행. 여러 개를 묶어 한꺼번에 실행하지 않는다.
- Docker Desktop은 GUI 앱이라 CLI 설치를 강제하지 말고 공식 다운로드 링크만 안내.
- 한국어로 대화한다.
