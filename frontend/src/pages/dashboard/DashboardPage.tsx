import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Cell,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar
} from "recharts";
import { useTranslation } from "../../hooks/useTranslation";
import { useLanguageStore } from "../../store/languageStore";

type StatusBucket = { status: string; count: number };

type MonthBucket = { month: string; count: number };

type Stats = {
  total: number;
  active: number;
  expiring: number;
  customers: number;
  byStatus?: StatusBucket[];
  createdPerMonth?: MonthBucket[];
  expiringPerMonth?: MonthBucket[];
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { language } = useLanguageStore();
  const { data, isLoading } = useQuery({
    queryKey: ["license-stats"],
    queryFn: async () => {
      const res = await apiClient.get<Stats>("/licenses/stats/summary");
      return res.data;
    }
  });

  const stats: Stats = data || {
    total: 0,
    active: 0,
    expiring: 0,
    customers: 0,
    byStatus: [],
    createdPerMonth: [],
    expiringPerMonth: []
  };

  return (
    <div 
      className="w-full min-h-screen bg-slate-100"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-2xl md:text-3xl font-semibold mb-6 flex items-center gap-2 text-slate-900">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
            📊
          </span>
          {t("dashboard.title")}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t("dashboard.activeLicenses")}
            </div>
            <div className="text-3xl font-semibold text-slate-900">
              {isLoading ? "…" : stats.active}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t("dashboard.activeLicenses")}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t("dashboard.expiringLicenses")}
            </div>
            <div className="text-3xl font-semibold text-amber-500">
              {isLoading ? "…" : stats.expiring}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t("dashboard.expiringLicenses")}
            </p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
              {t("dashboard.totalCustomers")}
            </div>
            <div className="text-3xl font-semibold text-emerald-600">
              {isLoading ? "…" : stats.customers}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {t("dashboard.totalCustomers")}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm mb-4">
          <h2 className="text-sm font-semibold mb-3 text-slate-900">
            {t("dashboard.statusSummary")}
          </h2>
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <p className="text-xs text-slate-600">
              Toplam lisans sayısı:{" "}
              <span className="font-semibold text-slate-900">
                {isLoading ? "…" : stats.total}
              </span>
              . Aşağıda statü bazında dağılımı görebilirsin.
            </p>
            <div className="flex-1 flex flex-col md:flex-row gap-4 items-center">
              <div className="w-full md:w-56 h-40">
                {stats.byStatus && stats.byStatus.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <RechartsTooltip
                        formatter={(value: any) => [`${value} lisans`, "Adet"]}
                      />
                      <Pie
                        data={stats.byStatus}
                        dataKey="count"
                        nameKey="status"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {stats.byStatus.map((entry, index) => {
                          const colors = [
                            "#3b82f6",
                            "#22c55e",
                            "#eab308",
                            "#ef4444"
                          ];
                          return (
                            <Cell
                              key={entry.status}
                              fill={colors[index % colors.length]}
                            />
                          );
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  !isLoading && (
                    <div className="text-xs text-slate-500 text-center mt-6">
                      Henüz lisans bulunmuyor.
                    </div>
                  )
                )}
              </div>
              <div className="flex flex-col gap-1 text-xs">
                {(stats.byStatus || []).map((b, index) => {
                  const colors = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"];
                  return (
                    <div key={b.status} className="flex items-center gap-2">
                      <span
                        className="inline-block h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: colors[index % colors.length]
                        }}
                      />
                      <span className="font-semibold text-slate-800">
                        {t(`licenses.status.${b.status}`)}
                      </span>
                      <span className="text-slate-600">{b.count} {t("common.count") || "adet"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 text-slate-900">
              {t("dashboard.createdPerMonth")}
            </h2>
            <div className="h-52">
              {stats.createdPerMonth && stats.createdPerMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.createdPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickMargin={4}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500 mt-6">
                  {t("dashboard.noData")}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
            <h2 className="text-sm font-semibold mb-3 text-slate-900">
              {t("dashboard.expiringPerMonth")}
            </h2>
            <div className="h-52">
              {stats.expiringPerMonth && stats.expiringPerMonth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.expiringPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 10 }}
                      tickMargin={4}
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="#f97316" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-xs text-slate-500 mt-6">
                  {t("dashboard.noData")}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

