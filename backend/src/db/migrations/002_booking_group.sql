-- 여러 날짜(기간)를 한 번에 신청하는 예약을 지원하기 위한 그룹 식별자.
-- 예약 단위는 여전히 "1일"(reservations 1행 = 1일)이며, 같은 요청으로 함께 신청된
-- 여러 날짜의 행을 묶어서 조회/일괄 확정·취소할 수 있도록 그룹 id만 추가한다.
ALTER TABLE reservations ADD COLUMN booking_group_id UUID;

CREATE INDEX idx_reservations_booking_group_id
  ON reservations (booking_group_id)
  WHERE booking_group_id IS NOT NULL;
