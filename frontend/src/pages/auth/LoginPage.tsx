import { useForm } from "react-hook-form";
import { useAuthStore } from "../../store/authStore";
import { apiClient } from "../../lib/apiClient";
import { useTranslation } from "../../hooks/useTranslation";
import { useLanguageStore } from "../../store/languageStore";

type FormValues = { email: string; password: string };

export function LoginPage() {
  const { register, handleSubmit } = useForm<FormValues>();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguageStore();

  const onSubmit = async (data: FormValues) => {
    const res = await apiClient.post("/auth/login", data);
    setAuth(res.data);
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative bg-cover bg-center bg-no-repeat"
      dir={language === "ar" ? "rtl" : "ltr"}
      style={{
        backgroundImage:
          "url(https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=2070&auto=format&fit=crop)"
      }}
    >
      {/* Overlay for better readability */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-20">
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value as "tr" | "en" | "ar" | "de")}
          className="bg-white/95 backdrop-blur-sm border border-slate-300 rounded-lg px-4 py-2 text-sm font-medium text-slate-700 shadow-md hover:bg-white transition-colors cursor-pointer"
        >
          <option value="tr">🇹🇷 Türkçe</option>
          <option value="en">🇬🇧 English</option>
          <option value="ar">🇸🇦 العربية</option>
          <option value="de">🇩🇪 Deutsch</option>
        </select>
      </div>

      {/* Login Form */}
      <div className="relative z-10 w-full max-w-lg px-6">
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-white/95 backdrop-blur-sm shadow-2xl rounded-2xl px-10 pt-10 pb-10 w-full"
        >
          <h1 className="text-3xl font-bold mb-8 text-center text-slate-800">
            {t("login.title")}
          </h1>
          <div className="mb-6">
            <label className="block text-slate-700 text-base font-medium mb-3">
              {t("login.email")}
            </label>
            <input
              type="email"
              className="shadow-sm border border-slate-300 rounded-lg w-full py-3 px-5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("login.emailPlaceholder")}
              {...register("email", { required: true })}
            />
          </div>
          <div className="mb-8">
            <label className="block text-slate-700 text-base font-medium mb-3">
              {t("login.password")}
            </label>
            <input
              type="password"
              className="shadow-sm border border-slate-300 rounded-lg w-full py-3 px-5 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={t("login.passwordPlaceholder")}
              {...register("password", { required: true })}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-6 rounded-lg transition-colors shadow-md hover:shadow-lg text-base"
          >
            {t("login.submit")}
          </button>
        </form>
      </div>
    </div>
  );
}


