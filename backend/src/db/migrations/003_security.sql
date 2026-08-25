-- 보안 강화: 관리자 열람/변경/삭제 이력 추적 (감사로그) + 확정/취소 수행자 기록.
-- 이름/전화번호/방문지역/대여목적 컬럼 자체는 애플리케이션 계층(AES-256-GCM)에서 암호화하므로
-- 스키마 변경은 필요 없다 (기존 TEXT 컬럼에 암호문 문자열이 저장된다).

ALTER TABLE reservations ADD COLUMN confirmed_by TEXT;
ALTER TABLE reservations ADD COLUMN cancelled_by TEXT;

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  admin_username TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('VIEW', 'CREATE', 'UPDATE', 'CONFIRM', 'CANCEL', 'DELETE')),
  reservation_id INT, -- 예약이 완전삭제된 이후에도 로그가 남아야 하므로 FK 제약을 걸지 않는다.
  reservation_number TEXT,
  detail JSONB, -- 완전삭제 시 원본 스냅샷 등 부가 정보
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_reservation_id ON audit_logs (reservation_id);
CREATE INDEX idx_audit_logs_admin_username ON audit_logs (admin_username);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at DESC);
