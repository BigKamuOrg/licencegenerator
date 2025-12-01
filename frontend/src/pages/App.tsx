import { useState } from "react";
import { useAuthStore } from "../store/authStore";
import { LoginPage } from "./auth/LoginPage";
import { LicenseListPage } from "./licenses/LicenseListPage";
import { DashboardPage } from "./dashboard/DashboardPage";
import { useTranslation } from "../hooks/useTranslation";
import { useLanguageStore } from "../store/languageStore";

type Tab = "dashboard" | "licenses";

export function App() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [tab, setTab] = useState<Tab>("dashboard");
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  if (!token) {
    return <LoginPage />;
  }

  return (
    <div 
      className="w-full min-h-screen flex flex-col bg-slate-900"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <header className="w-full bg-slate-950 text-white px-6 py-3 flex items-center justify-between shadow">
        <div className="font-semibold flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-600/80 text-sm">
              BG
            </span>
            <span>{t("app.title")}</span>
          </div>
          <nav className="flex items-center gap-2 text-xs md:text-sm">
            <button
              onClick={() => setTab("dashboard")}
              className={`px-3 py-1 rounded-full transition-colors ${
                tab === "dashboard"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {t("app.dashboard")}
            </button>
            <button
              onClick={() => setTab("licenses")}
              className={`px-3 py-1 rounded-full transition-colors ${
                tab === "licenses"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700"
              }`}
            >
              {t("app.licenses")}
            </button>
          </nav>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as "tr" | "en" | "ar" | "de")}
            className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            <option value="tr">🇹🇷 TR</option>
            <option value="en">🇬🇧 EN</option>
            <option value="ar">🇸🇦 AR</option>
            <option value="de">🇩🇪 DE</option>
          </select>
          {user && (
            <span className="hidden md:inline text-slate-200">
              {user.full_name} ({user.base_role})
            </span>
          )}
          <button
            onClick={logout}
            className="px-3 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-xs md:text-sm"
          >
            {t("app.logout")}
          </button>
        </div>
      </header>

      <main className="flex-1">
        {tab === "dashboard" ? <DashboardPage /> : <LicenseListPage />}
      </main>
    </div>
  );
}

