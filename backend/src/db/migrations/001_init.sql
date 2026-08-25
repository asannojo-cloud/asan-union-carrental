-- 아산시공무원노동조합 차량 렌트사업 예약관리 시스템 — 초기 스키마
-- PRD 26~28절 데이터 구조 기반.

-- ── 관리자 계정 (일반 사용자 로그인은 없음 — PRD 3, 14절) ──────────────────────
CREATE TABLE admin_users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  failed_login_count INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

-- ── 차량 (PRD 27, 48절 — 향후 추가 대비, 하드코딩하지 않고 DB로 관리) ───────────
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_name TEXT NOT NULL,
  -- 이용 가능 요일 코드 배열. 예: {MON,TUE,WED,THU,FRI,SAT,SUN} / {SAT,SUN}
  available_weekdays TEXT[] NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 예약 (PRD 26절) ──────────────────────────────────────────────────────────
CREATE TABLE reservations (
  id SERIAL PRIMARY KEY,
  reservation_number TEXT NOT NULL UNIQUE,
  vehicle_id INT NOT NULL REFERENCES vehicles (id),
  rental_date DATE NOT NULL,
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  phone TEXT NOT NULL,
  destination TEXT,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'CANCELLED')),
  -- 예약 신청 경로: 'user'(일반 사용자 신청) 또는 관리자 계정 username(관리자 직접등록/수정) — PRD 20, 26절
  created_by TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- 핵심 무결성 규칙 (PRD 12, 40절): 동일 차량 + 동일 날짜에 CANCELLED가 아닌 예약은 하나만 존재할 수 있다.
-- 취소된 예약은 제외해 같은 날짜/차량을 다시 예약할 수 있도록 한다.
CREATE UNIQUE INDEX uq_reservations_vehicle_date_active
  ON reservations (vehicle_id, rental_date)
  WHERE status <> 'CANCELLED';

CREATE INDEX idx_reservations_rental_date ON reservations (rental_date);
CREATE INDEX idx_reservations_status ON reservations (status);
CREATE INDEX idx_reservations_name ON reservations (name);
CREATE INDEX idx_reservations_department ON reservations (department);
