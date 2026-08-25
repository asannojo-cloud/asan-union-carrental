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

      <footer className="max-w-2xl w-full mx-auto px-4 py-6 text-xs text-slate-400 text-center space-y-1.5">
        <p>예약 관련 문의는 아산시공무원노동조합으로 문의해주세요.</p>
        <a
          href="tel:041-540-2667"
          className="inline-flex items-center gap-1.5 text-brand-600 font-medium hover:text-brand-700"
        >
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor" aria-hidden="true">
            <path d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 011 1V20a1 1 0 01-1 1C10.61 21 3 13.39 3 4a1 1 0 011-1h3.49a1 1 0 011 1c0 1.24.2 2.45.57 3.57a1 1 0 01-.25 1.02l-2.19 2.2z" />
          </svg>
          041-540-2667
        </a>
      </footer>
    </div>
  );
}
