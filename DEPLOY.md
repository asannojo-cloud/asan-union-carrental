# 배포 가이드 (Render)

## 1. GitHub 저장소 (완료 후 다음 단계로)

`git@github.com:asannojo-cloud/asan-union-carrental.git` 에 코드가 push되어 있어야 합니다.

## 2. Render Blueprint로 배포

1. https://dashboard.render.com 접속 (Render 계정으로 로그인)
2. **New** → **Blueprint** 선택
3. GitHub 계정 연결 (처음이면 Render가 GitHub 권한을 요청함) 후 `asannojo-cloud/asan-union-carrental` 저장소 선택
4. Render가 저장소 루트의 `render.yaml`을 자동으로 읽어 다음 2개 리소스를 제안합니다:
   - **Web Service**: `asan-union-carrental` (Node, Free plan)
   - **PostgreSQL DB**: `asan-union-carrental-db` (Free plan)
5. **Apply** 클릭 → 자동으로 DB 생성 + 빌드(`npm install && npm run build`) + 배포(`npm run start`) 진행
6. `SESSION_SECRET`은 `generateValue: true`로 Render가 자동 생성하고, `DATABASE_URL`도 방금 만든 DB에 자동 연결됩니다 — 별도 입력 불필요.

## 3. 배포 후 최초 1회 — DB 마이그레이션 + 시드

Render 대시보드 → 해당 Web Service → **Shell** 탭에서:

```bash
npm run migrate
npm run seed
```

(Render Free plan은 Shell 접속이 제한적일 수 있습니다 — 안 되면 "Manual Deploy" 전 `render.yaml`의 `buildCommand`에 일시적으로 `&& npm run migrate --workspace backend && npm run seed --workspace backend`를 추가했다가, 완료 후 다시 제거하는 방법도 있습니다.)

## 4. 확인

- `https://asan-union-carrental.onrender.com` 접속 → 예약 캘린더가 보이면 성공
- `/admin/login` → `admin` / `Admin!2026` 으로 로그인 → **관리자 설정에서 비밀번호를 즉시 변경**

## 5. 알아둘 점 (Render Free plan)

- Free plan Postgres는 **90일 후 만료**됩니다. 실제 운영에는 유료 플랜(월 $7~) 전환을 권장합니다.
- Free plan 웹서비스는 트래픽이 없으면 슬립 모드로 들어가 첫 요청 시 수십 초 지연이 발생할 수 있습니다. 실제 조합원이 상시 이용하는 서비스라면 유료 플랜(Starter, $7/월~) 권장.
- `FRONTEND_ORIGIN` 값은 실제 배포 도메인이 확정되면 (예: 커스텀 도메인 연결 시) `render.yaml`에서 업데이트 후 재배포하세요. (참고: 운영 환경은 프론트/백엔드가 동일 오리진으로 서빙되므로 CORS 자체가 비활성화되어 있어 이 값은 크게 영향 없습니다.)

## 6. 커스텀 도메인(선택)

노동조합에서 별도 도메인이 있다면 Render → 해당 서비스 → **Settings** → **Custom Domains**에서 연결 가능합니다.
