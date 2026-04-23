---
name: dev-server
description: 로컬 개발 서버를 기동합니다. Supabase 로컬 Postgres 컨테이너를 띄우고(필요 시), .env.local을 최신 값으로 동기화한 뒤, Next.js 개발 서버(npm run dev)를 실행합니다. 수강생이 "로컬 서버 띄워줘", "dev 서버 실행", "개발 환경 시작" 등을 요청할 때, 또는 setup-dev-environment 완료 직후 이 스킬을 제안합니다. 선행 조건: /setup-dev-environment가 끝나서 node·docker·supabase CLI가 모두 준비된 상태.
---

# dev-server

로컬 개발 환경을 **한 번에 기동**하는 스킬. `/setup-dev-environment`로 의존성이 준비된 뒤 이어서 호출하는 것을 전제로 한다.

## 선행 조건

호출 시 우선 다음을 빠르게 재검증(병렬 Bash)한다. 하나라도 실패하면 "먼저 `/setup-dev-environment`를 실행해주세요" 메시지로 중단.

- `docker info` (데몬 기동 여부)
- `supabase --version`
- `node -v` (20+ 인지)

## 절차

### 1. Supabase 프로젝트 초기화 확인

- `test -f supabase/config.toml` 이 없으면 `supabase init` 을 사용자 승인 후 실행.

### 2. Supabase 컨테이너 기동

- `supabase status` 를 먼저 실행해서 이미 돌고 있는지 확인.
- 돌고 있지 않으면 `supabase start` 실행 (최초엔 이미지 pull로 몇 분 걸릴 수 있음을 안내).
- 기동 성공 후 `supabase status` 출력에서 다음 값을 추출:
  - `API URL` → `NEXT_PUBLIC_SUPABASE_URL`
  - `anon key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `DB URL` → `DATABASE_URL`

### 3. `.env.local` 동기화

- 저장소 루트의 `.env.local` 을 읽어 위 세 값과 비교.
- 파일이 없거나 값이 다르면 위 세 키만 갱신(다른 키는 보존). 변경 전/후를 수강생에게 diff로 보여주고 승인 받음.
- `.env.local` 은 **절대 커밋하지 않는다** — 저장소의 `.gitignore`에 포함돼 있는지 확인하고 없으면 추가를 제안.

### 4. Node 의존성 설치 확인

- `test -d node_modules` 가 아니면 `npm ci` 또는 `npm install` 제안.

### 5. Drizzle 마이그레이션 (있을 경우)

- `test -d drizzle` 이면 `npm run db:migrate` 실행을 제안. 로컬 DB가 최신 마이그레이션 기준으로 올라와 있어야 서버가 정상 동작.
- `drizzle/` 디렉토리가 없으면 "스키마가 아직 없습니다. Claude에게 tasks 테이블 정의를 요청하세요"라고 안내하고 다음 단계로 넘어감.

### 6. Next.js 개발 서버 실행

- `npm run dev` 를 **백그라운드로** 실행(`run_in_background: true`).
- 실행 후 5초 이내에 로그를 확인하여 `ready - started server on ...` 또는 `Local: http://localhost:3000` 라인이 나왔는지 확인. 실패 시 에러 출력을 수강생에게 보여줌.

### 7. 마무리 안내

모두 성공하면 다음 한 단락을 수강생에게 보여주고 스킬을 종료한다.

> ✅ 로컬 개발 서버 준비 완료
> - Supabase Studio: http://127.0.0.1:54323
> - Next.js: http://localhost:3000
> - 서버는 백그라운드에서 실행 중입니다. 종료하려면 "dev 서버 꺼줘"라고 말하거나 `supabase stop` 을 실행하세요.

## 규칙

- **자동 실행 금지**. 각 명령(`supabase init`, `supabase start`, `npm ci`, `npm run db:migrate`, `npm run dev`)은 한 번에 하나씩 수강생에게 "실행할까요?"라고 물어본 뒤 승인된 것만 실행한다.
- Supabase CLI는 이 프로젝트에서 **로컬 컨테이너 기동 용도로만** 쓴다. `supabase migration new` / `supabase db push` / `supabase db reset` 은 절대 제안하지 않는다. 스키마 변경은 Drizzle.
- 프로덕션(원격) Supabase에는 절대 연결하지 않는다. 이 스킬은 로컬 전용.
- 한국어로 대화한다.
