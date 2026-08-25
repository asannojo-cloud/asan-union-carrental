import { useState, type FormEvent } from "react";
import { api, ApiError } from "../shared/api";
import PasswordInput from "../shared/PasswordInput";

export default function AdminSettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      await api.patch("/admin/auth/password", { currentPassword, newPassword });
      setMessage("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "변경 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-5">관리자 설정</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">현재 비밀번호</label>
          <PasswordInput value={currentPassword} onChange={setCurrentPassword} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">새 비밀번호 (8자 이상)</label>
          <PasswordInput value={newPassword} onChange={setNewPassword} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        {message && <p className="text-sm text-status-confirmed">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting} className="w-full bg-brand-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50">
          {submitting ? "변경 중..." : "비밀번호 변경"}
        </button>
      </form>
    </div>
  );
}
