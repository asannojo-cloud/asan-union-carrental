# 아산시공무원노동조합 차량 렌트사업 예약관리 시스템

PRD 기준: 로그인 없는 사용자 예약신청 + 관리자 승인/직접등록 기반 차량(하모니카/아아카) 렌트 예약관리 시스템.

## 스택

- **백엔드**: Node.js + Express + TypeScript, PostgreSQL(raw SQL, `pg`), `express-session` + `connect-pg-simple`, `bcrypt`, `zod`
- **프론트엔드**: React 19 + Vite + TypeScript + Tailwind CSS 4 + `react-router-dom`, PWA(`vite-plugin-pwa`)
- 기존 [asgongno-membercard](../asgongno-membercard), [asan-union-partners](../asan-union-partners)와 동일한 구조/컨벤션을 따릅니다.

## 최초 설정

1. PostgreSQL에 DB/롤 생성 (최초 1회, 이미 완료됨 — `asan_union_carrental` DB, `carrental_app` 롤)
2. `backend/.env` 확인 (이미 생성됨, git에는 포함되지 않음 — `.env.example` 참고)
3. 의존성 설치 (루트에서):
   ```bash
   npm install
   ```
4. 마이그레이션 + 시드 데이터 (이미 실행됨, 재실행해도 안전 — 이미 적용된 마이그레이션/기존 데이터는 건너뜀):
   ```bash
   npm run migrate
   npm run seed
   ```

## 개발 서버 실행

```bash
npm run dev:backend    # http://localhost:4200
npm run dev:frontend   # http://localhost:5190 (백엔드로 /api 프록시)
```

## 기본 관리자 계정

- 아이디: `admin`
- 비밀번호: `Admin!2026`

**운영 배포 전 반드시 관리자 페이지 → 관리자 설정에서 비밀번호를 변경하세요.**

## 핵심 운영 규칙 (PRD 요약)

- 예약 단위는 "1일" — 동일 차량 + 동일 날짜 중복예약은 DB 레벨(부분 UNIQUE 인덱스)에서 원천 차단
- 하모니카: 매일 이용 가능 / 아아카: 토·일요일만 이용 가능 (서버에서 요일 검증)
- 일반 사용자는 로그인 없이 예약신청만 가능, 개인정보는 절대 공개 API에 포함하지 않음
- 관리자만 세션 인증 후 예약 확정/취소/수정/직접등록/완전삭제 가능
- 모든 날짜/시간은 KST(Asia/Seoul) 기준으로 처리 (`backend/src/utils/kstDate.ts`, `frontend/src/shared/formatters.ts`)
- 예약현황은 8초 주기 폴링으로 자동 갱신 (WebSocket 없이 PRD 32절의 대체 방식 채택)

## 배포

```bash
npm run build   # 프론트 빌드 후 백엔드 빌드
npm run start   # backend/dist/server.js 실행 (frontend/dist를 함께 서빙)
```

운영 환경에서는 `NODE_ENV=production`, 새로운 `SESSION_SECRET`, 운영 PostgreSQL `DATABASE_URL`을 설정하세요.
