import { Outlet, Link } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-brand-900 text-white">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-brand-200">아산시공무원노동조합</p>
            <h1 className="text-lg font-bold">차량 렌트사업</h1>
          </div>
          <Link
            to="/admin/login"
            className="text-xs text-brand-100 border border-brand-600 rounded-full px-3 py-1.5 hover:bg-brand-800"
          >
            관리자 페이지
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">
        <Outlet />
      </main>

      <footer className="max-w-2xl w-full mx-auto px-4 py-6 text-xs text-slate-400 text-center">
        예약 관련 문의는 아산시공무원노동조합으로 문의해주세요.
      </footer>
    </div>
  );
}
