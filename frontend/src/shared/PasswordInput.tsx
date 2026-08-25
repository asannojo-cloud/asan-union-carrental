import { useState } from "react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  minLength?: number;
  className?: string;
}

/**
 * 눈 모양 아이콘으로 입력한 비밀번호를 평문으로 확인할 수 있는 입력창.
 * 붙여넣기/자동완성 등으로 실제 입력된 값이 의도와 다른지 눈으로 바로 확인할 수 있게 한다.
 */
export default function PasswordInput({ value, onChange, autoComplete, autoFocus, required, minLength, className }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required={required}
        minLength={minLength}
        className={`${className ?? ""} pr-10`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 px-1"
      >
        {visible ? (
          // 눈 감김(슬래시) 아이콘 — 흑백 단색
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18M10.6 10.6a2.5 2.5 0 003.5 3.5M9.36 5.6A10.4 10.4 0 0112 5.25c5.25 0 9 4.5 10.5 6.75-.62.94-1.86 2.6-3.6 4.03M6.6 6.6C4.6 7.94 3.1 9.87 1.5 12c1.5 2.25 5.25 6.75 10.5 6.75 1.15 0 2.23-.19 3.23-.53"
            />
          </svg>
        ) : (
          // 눈 아이콘 — 흑백 단색
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M1.5 12S5.25 5.25 12 5.25 22.5 12 22.5 12 18.75 18.75 12 18.75 1.5 12 1.5 12z" />
            <circle cx="12" cy="12" r="2.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
