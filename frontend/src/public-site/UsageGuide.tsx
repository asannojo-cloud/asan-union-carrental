import { useState, type ReactNode } from "react";

const ACCOUNT_BANK = "농협";
const ACCOUNT_NUMBER = "301-0183-3328-41";
const ACCOUNT_HOLDER = "아산시공무원노동조합";

interface Props {
  agreed: boolean;
  onAgreedChange: (agreed: boolean) => void;
}

/** 차량 이용안내문 + 지정계좌 안내 + 필수 동의 체크박스. */
export default function UsageGuide({ agreed, onAgreedChange }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopyAccount() {
    const text = `${ACCOUNT_BANK} ${ACCOUNT_NUMBER} (${ACCOUNT_HOLDER})`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 클립보드 접근이 막힌 환경(권한 거부 등)에서는 조용히 무시한다 — 계좌번호는 화면에 그대로 보인다.
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <p className="font-bold text-slate-900 mb-3">🚐 차량 이용안내문 (필수 확인)</p>

      <div className="max-h-72 overflow-y-auto text-xs text-slate-600 space-y-3 pr-1 border border-slate-100 rounded-xl p-3 bg-slate-50">
        <Section title="사용차종">
          카니발 9인승(흰색, 160하8263)
          <br />
          · 평상시 6인승, 트렁크 공간을 펼치면 9인승임.
          <br />· 장거리 운행이나 적재물이 많은 경우는 6인 탑승이 적합함.
        </Section>
        <Section title="신청대상">아산시공무원노동조합 조합원 및 후원조합원(이하 '조합원')</Section>
        <Section title="신청사유">
          조문, 동호회 활동, 부서단합행사, 휴일여행 등
          <br />
          <span className="text-brand-700 font-medium">★ 무료사용</span> - 조합원 및 조합원 가족의 상가 조문시
        </Section>
        <Section title="사용 및 운전가능자">
          조합원 및 조합원이 지정한 자로서, 만26세 이상 및 운전경력 1년 이상인 자
        </Section>
        <Section title="사용비용">
          1일(00:00~24:00 기준) 5만원
          <br />
          <span className="text-brand-700 font-medium">★ 예약접수</span> — 이 앱의 예약 캘린더에서 차량/날짜 선택 후
          신청
          <br />
          <span className="text-brand-700 font-medium">★ 대금결제</span> — 신청일부터 3일간 지정계좌 입금, 미입금시
          예약취소
          <br />
          ※ 유료/무료사용 모두 유류비, 고속도로통행료는 사용자가 부담
        </Section>

        <div className="rounded-lg bg-white border border-brand-200 p-3">
          <p className="text-slate-500 mb-1">지정계좌</p>
          <button
            type="button"
            onClick={handleCopyAccount}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="font-medium text-slate-900">
              {ACCOUNT_BANK} {ACCOUNT_NUMBER} ({ACCOUNT_HOLDER})
            </span>
            <span
              className={`shrink-0 text-[11px] font-medium px-2 py-1 rounded-full ${
                copied ? "bg-status-available/10 text-status-available" : "bg-brand-50 text-brand-700"
              }`}
            >
              {copied ? "복사됨 ✓" : "계좌번호 복사"}
            </span>
          </button>
        </div>

        <Section title="환불규정">
          1. 토요일, 일요일, 공휴일, 하계휴가기간이 포함된 예약의 취소
          <br />
          &nbsp;&nbsp;- 7일전 100% 환불, 5일전 50% 환불, 5일미만 환불 불가
          <br />
          &nbsp;&nbsp;※ 천재지변 등 불가항력적인 경우 예외
          <br />
          2. 그 외 기간 예약의 취소 - 100% 환불
        </Section>
        <Section title="보험관련">
          사고 시 사용자(운전자) 자기부담금 20만원
          <br />
          ※ 사고 및 파손 발생시 즉시 아산시공무원노동조합(
          <a href="tel:041-540-2667" className="text-brand-700 underline">
            041-540-2667
          </a>
          )에 신고하여야 함.
        </Section>
        <Section title="차량 출고 / 반납시 확인사항">
          · 차량 상태 이상 유무 반드시 확인
          <br />
          · 주유량계 수치 점검 (100% 주유 원칙)
          <br />· 반납시 실내외 기본 청소 및 세차(흙, 모래, 쓰레기 등 반드시 제거)
        </Section>
        <Section title="기타 유의사항">
          · 운행시 차량 내 흡연 금지
          <br />
          · 과속, 주정차위반 등 과징금 발생시 운전자가 부담
          <br />· 6인 이상 탑승시 고속도로버스전용차로 이용가능(시내지역 버스전용차로 이용불가)
        </Section>
        <p className="font-bold text-red-500">【 주의사항 : 상기 사용 조건 위반 시 패널티 부여 】</p>
      </div>

      <div className="mt-3 text-xs text-slate-600 bg-brand-50 rounded-xl p-3 space-y-1.5">
        <p>
          상기 본인은 아산시공무원노동조합 (후원)조합원으로서 노동조합 차량을 사용함에 있어 아래 사항에 대하여
          충분히 숙지하였으며, 붙임의 차량사용 조건에 동의하였기에 차량사용을 신청합니다.
        </p>
        <p>1. 차량 사용기간 동안 발생한 모든 사항에 대하여는 사용자의 책임입니다.</p>
        <p>2. 차량 사용 및 운전은 신청자 및 신청자 지정한 자가 가능합니다.</p>
        <p>3. 차량 사용조건을 위반할 경우 차후 신청이 금지될 수 있습니다.</p>
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm font-medium text-slate-800 cursor-pointer">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => onAgreedChange(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-brand-700 shrink-0"
        />
        위 이용안내문 및 차량사용 조건을 모두 확인하였으며 이에 동의합니다. <span className="text-red-500">(필수)</span>
      </label>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-medium text-slate-900">○ {title}</p>
      <p className="mt-0.5">{children}</p>
    </div>
  );
}
