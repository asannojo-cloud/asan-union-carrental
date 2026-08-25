import { useState } from "react";

export const ACCOUNT_BANK = "농협";
export const ACCOUNT_NUMBER = "301-0183-3328-41";
export const ACCOUNT_HOLDER = "아산시공무원노동조합";

/**
 * 지정계좌 표시 + 클릭 시 클립보드 복사.
 * 은행마다 앱/딥링크 방식이 달라 웹에서 범용으로 송금화면을 직접 열 수는 없어,
 * 계좌번호를 복사해 본인 은행 앱에 붙여넣는 방식을 사용한다.
 */
export default function AccountCopyBox({ className }: { className?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
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
    <div className={`rounded-lg bg-white border border-brand-200 p-3 ${className ?? ""}`}>
      <p className="text-slate-500 mb-1 text-xs">지정계좌 (누르면 복사)</p>
      <button type="button" onClick={handleCopy} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="font-medium text-slate-900 text-sm">
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
  );
}
