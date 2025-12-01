import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../lib/apiClient";
import { FormEvent, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useTranslation } from "../../hooks/useTranslation";

type License = {
  id: string;
  company_name: string;
  company_id: string;
  customer_email?: string;
  license_type: string;
  max_users: number;
  expiry_date: string;
  status: string;
  license_key_prefix: string;
};

type FormState = {
  companyId: string;
  companyName: string;
  customerEmail: string;
  licenseType: string;
  maxUsers: number;
  expiryYears: number;
  keyPrefix: string;
};

const defaultForm: FormState = {
  companyId: "DEMO-COMPANY-001",
  companyName: "Demo Company Ltd.",
  customerEmail: "demo@example.com",
  licenseType: "ENTERPRISE",
  maxUsers: 100,
  expiryYears: 1,
  keyPrefix: "DEMO-ENT-2024"
};

export function LicenseListPage() {
  const { t, language } = useTranslation();
  const queryClient = useQueryClient();

  const { data: licenses, isLoading } = useQuery({
    queryKey: ["licenses"],
    queryFn: async () => {
      const res = await apiClient.get("/licenses");
      return res.data as License[];
    }
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<License | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<keyof License>("company_name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkRows, setBulkRows] = useState<any[]>([]);

  const totalLicenses = licenses?.length ?? 0;
  const enterpriseCount =
    licenses?.filter((l) => l.license_type === "ENTERPRISE").length ?? 0;

  const openCreateModal = () => {
    setEditing(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (lic: License) => {
    const exp = new Date(lic.expiry_date);
    const years =
      new Date(lic.expiry_date).getFullYear() - new Date().getFullYear() || 1;
    setEditing(lic);
    setForm({
      companyId: lic.company_id,
      companyName: lic.company_name,
      customerEmail: lic.customer_email || "",
      licenseType: lic.license_type,
      maxUsers: lic.max_users,
      expiryYears: years,
      keyPrefix: lic.license_key_prefix
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const expiry = new Date(
        today.getFullYear() + form.expiryYears,
        today.getMonth(),
        today.getDate()
      )
        .toISOString()
        .slice(0, 10);

      const payload = {
        license_type: form.licenseType,
        company_name: form.companyName,
        company_id: form.companyId,
        customer_email: form.customerEmail || null,
        expiry_date: expiry,
        max_users: form.maxUsers,
        max_assets: 1000,
        environment: "PRODUCTION",
        support_level: "STANDARD",
        data_center: "EU",
        license_key_prefix: form.keyPrefix
      };

      if (editing) {
        return apiClient.put(`/licenses/${editing.id}`, payload);
      }
      return apiClient.post("/licenses", payload);
    },
    onSuccess: () => {
      setMessage(editing ? t("licenses.messages.updated") : t("licenses.messages.created"));
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      setIsModalOpen(false);
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err) => {
      console.error(err);
      setMessage(t("licenses.messages.updated") + " (hata)");
      setTimeout(() => setMessage(null), 5000);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/licenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
    }
  });

  const emailMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post(`/licenses/${id}/send-email`);
      return res.data;
    },
    onSuccess: () => {
      setMessage(t("licenses.messages.emailSent"));
      setTimeout(() => setMessage(null), 3000);
    },
    onError: (err: any) => {
      console.error("Email error:", err);
      const errorMsg = err.response?.data?.message || err.message || "E-posta gönderilemedi.";
      setMessage(`E-posta gönderilemedi: ${errorMsg}`);
      setTimeout(() => setMessage(null), 6000);
    }
  });

  const handleModalSubmit = (e: FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  const gridRows = useMemo(() => {
    const rows = licenses ?? [];

    const filtered = rows.filter((l) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        l.company_name.toLowerCase().includes(q) ||
        l.company_id.toLowerCase().includes(q) ||
        (l.customer_email || "").toLowerCase().includes(q) ||
        l.license_type.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const av = a[sortBy];
      const bv = b[sortBy];
      if (av === bv) return 0;
      const dir = sortDir === "asc" ? 1 : -1;
      if (typeof av === "number" && typeof bv === "number") {
        return av > bv ? dir : -dir;
      }
      return String(av).localeCompare(String(bv)) * dir;
    });

    const start = (page - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [licenses, search, sortBy, sortDir, page, pageSize]);

  const totalFiltered = useMemo(() => {
    if (!licenses) return 0;
    if (!search.trim()) return licenses.length;
    const q = search.toLowerCase();
    return licenses.filter(
      (l) =>
        l.company_name.toLowerCase().includes(q) ||
        l.company_id.toLowerCase().includes(q) ||
        (l.customer_email || "").toLowerCase().includes(q) ||
        l.license_type.toLowerCase().includes(q)
    ).length;
  }, [licenses, search]);

  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  const changeSort = (field: keyof License) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  const bulkMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post("/licenses/bulk", {
        licenses: bulkRows.map((r) => ({
          license_type: r.license_type,
          company_name: r.company_name,
          company_id: r.company_id,
          customer_email: r.customer_email || null,
          expiry_date: r.expiry_date,
          max_users: Number(r.max_users),
          max_assets: Number(r.max_assets) || 1000,
          environment: r.environment || "PRODUCTION",
          support_level: r.support_level || "STANDARD",
          data_center: r.data_center || "EU",
          license_key_prefix: r.license_key_prefix
        }))
      });
    },
    onSuccess: () => {
      setMessage(t("licenses.messages.bulkSuccess"));
      queryClient.invalidateQueries({ queryKey: ["licenses"] });
      setBulkModalOpen(false);
      setBulkRows([]);
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err) => {
      console.error(err);
      setMessage(t("licenses.messages.bulkError"));
      setTimeout(() => setMessage(null), 5000);
    }
  });

  const handleTemplateDownload = () => {
    const header = [
      "company_id",
      "company_name",
      "customer_email",
      "license_type",
      "expiry_date",
      "max_users",
      "max_assets",
      "environment",
      "support_level",
      "data_center",
      "license_key_prefix"
    ];
    const sample = [
      [
        "DEMO-COMPANY-001",
        "Demo Company Ltd.",
        "demo@example.com",
        "ENTERPRISE",
        "2026-12-31",
        100,
        1000,
        "PRODUCTION",
        "STANDARD",
        "EU",
        "DEMO-ENT-2024"
      ]
    ];
    const ws = XLSX.utils.aoa_to_sheet([header, ...sample]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "licenses");
    XLSX.writeFile(wb, "license_import_template.xlsx");
  };

  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = new Uint8Array(evt.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as any[];
      setBulkRows(
        json.map((row) => ({
          company_id: row.company_id || row["Şirket ID"] || "",
          company_name: row.company_name || row["Şirket Adı"] || "",
          customer_email: row.customer_email || row["Müşteri E-posta"] || "",
          license_type: row.license_type || row["Lisans Tipi"] || "ENTERPRISE",
          expiry_date: row.expiry_date || row["Bitiş Tarihi"],
          max_users: row.max_users || row["Maks. Kullanıcı"] || 1,
          max_assets: row.max_assets || row["Maks. Varlık"] || 1000,
          environment: row.environment || "PRODUCTION",
          support_level: row.support_level || "STANDARD",
          data_center: row.data_center || "EU",
          license_key_prefix: row.license_key_prefix || row["Anahtar Ön Eki"]
        }))
      );
    };
    reader.readAsArrayBuffer(file);
  };

  if (isLoading) return <div>{t("common.loading")}</div>;

  return (
    <div 
      className="w-full min-h-screen bg-slate-100 flex"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="flex-1 max-w-6xl mx-auto py-8 px-6">
        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          <h1 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <span className="text-blue-600">▌</span> {t("licenses.title")}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-md bg-emerald-600 text-white text-sm font-medium shadow hover:bg-emerald-700 transition-colors"
            >
              {t("licenses.bulkAdd")}
            </button>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 transition-colors"
            >
              + {t("licenses.addNew")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              {t("licenses.totalLicenses")}
            </div>
            <div className="text-2xl font-semibold text-slate-800">
              {totalLicenses}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">
              Enterprise
            </div>
            <div className="text-2xl font-semibold text-slate-800">
              {enterpriseCount}
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-4 rounded-md bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
            {message}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-sm font-semibold text-slate-700">
              {t("licenses.table.title")}
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <input
                placeholder="Ara: şirket, ID, e‑posta, tip..."
                className="border border-slate-300 rounded-md px-2 py-1 text-xs w-44 md:w-64"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              <select
                className="border border-slate-300 rounded-md px-2 py-1 text-xs"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th
                    className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                    onClick={() => changeSort("company_name")}
                  >
                    {t("licenses.table.company")}
                  </th>
                  <th
                    className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                    onClick={() => changeSort("license_type")}
                  >
                    {t("licenses.table.license")}
                  </th>
                  <th
                    className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                    onClick={() => changeSort("max_users")}
                  >
                    {t("licenses.table.maxUsers")}
                  </th>
                  <th
                    className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                    onClick={() => changeSort("expiry_date")}
                  >
                    {t("licenses.table.expiryDate")}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">{t("licenses.table.status")}</th>
                  <th
                    className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                    onClick={() => changeSort("customer_email")}
                  >
                    {t("licenses.table.customerEmail")}
                    {sortBy === "customer_email" && (
                      <span className="ml-1 text-blue-600">
                        {sortDir === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </th>
                  <th className="px-4 py-2 text-right font-semibold">
                    {t("licenses.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {gridRows.length === 0 ? (
                  <tr>
                    <td
                      className="px-4 py-4 text-center text-slate-500"
                      colSpan={7}
                    >
                      {t("licenses.table.noLicenses")}
                    </td>
                  </tr>
                ) : (
                  gridRows.map((lic) => (
                    <tr
                      key={lic.id}
                      className="border-t border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {lic.company_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lic.company_id}
                        </div>
                      </td>
                      <td className="px-4 py-3">{lic.license_type}</td>
                      <td className="px-4 py-3">{lic.max_users}</td>
                      <td className="px-4 py-3">
                        {new Date(lic.expiry_date).toLocaleDateString("tr-TR")}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {t(`licenses.status.${lic.status}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-slate-600">
                          {lic.customer_email || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100"
                            onClick={() => openEditModal(lic)}
                          >
                            {t("licenses.table.edit")}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (
                                window.confirm(
                                  t("licenses.messages.deleteConfirm")
                                )
                              ) {
                                deleteMutation.mutate(lic.id);
                              }
                            }}
                          >
                            {t("licenses.table.delete")}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border border-blue-300 text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (lic.status !== "SIGNED") {
                                setMessage(
                                  t("licenses.messages.emailNotSigned")
                                );
                                setTimeout(() => setMessage(null), 4000);
                                return;
                              }
                              const email = lic.customer_email?.trim();
                              if (!email || email === "-") {
                                setMessage(
                                  t("licenses.messages.emailNotSet")
                                );
                                setTimeout(() => setMessage(null), 4000);
                                return;
                              }
                              emailMutation.mutate(lic.id);
                            }}
                            disabled={
                              lic.status !== "SIGNED" ||
                              !lic.customer_email ||
                              lic.customer_email.trim() === "-"
                            }
                            title={
                              lic.status !== "SIGNED"
                                ? t("licenses.messages.emailNotSigned")
                                : !lic.customer_email || lic.customer_email.trim() === "-"
                                ? t("licenses.messages.emailNotSet")
                                : t("licenses.messages.emailSent")
                            }
                          >
                            {t("licenses.table.sendEmail")}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border border-emerald-300 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={() => {
                              if (lic.status !== "SIGNED") {
                                setMessage(
                                  t("licenses.messages.downloadError")
                                );
                                setTimeout(() => setMessage(null), 4000);
                                return;
                              }

                              const licenseData = {
                                id: lic.id,
                                company_name: lic.company_name,
                                company_id: lic.company_id,
                                license_type: lic.license_type,
                                max_users: lic.max_users,
                                max_assets: lic.max_assets || 1000,
                                expiry_date: lic.expiry_date,
                                status: lic.status,
                                license_key_prefix: lic.license_key_prefix,
                                environment: "PRODUCTION",
                                support_level: "STANDARD",
                                data_center: "EU",
                                customer_email: lic.customer_email || "",
                                created_at: lic.created_at,
                                created_by: lic.created_by
                              };
                              const blob = new Blob(
                                [JSON.stringify(licenseData, null, 2)],
                                { type: "application/json" }
                              );
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement("a");
                              a.href = url;
                              a.download = `license-${lic.company_id}-${lic.id.slice(0, 8)}.json`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                              setMessage(t("licenses.messages.downloadSuccess"));
                              setTimeout(() => setMessage(null), 3000);
                            }}
                            disabled={lic.status !== "SIGNED"}
                            title={
                              lic.status !== "SIGNED"
                                ? t("licenses.messages.downloadError")
                                : t("licenses.messages.downloadSuccess")
                            }
                          >
                            {t("licenses.table.download")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
          <div>
            Toplam {totalFiltered} kayıt, sayfa {page} / {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-50"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Önceki
            </button>
            <button
              className="px-2 py-1 rounded border border-slate-300 disabled:opacity-50"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Sonraki
            </button>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">
              {t("licenses.form.title")}
            </h3>
            <form onSubmit={handleModalSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.companyId")}
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.companyId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, companyId: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.companyName")}
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.companyName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, companyName: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.customerEmail")}
                  </label>
                  <input
                    type="email"
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.customerEmail}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, customerEmail: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.licenseType")}
                  </label>
                  <select
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.licenseType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, licenseType: e.target.value }))
                    }
                  >
                    <option value="ENTERPRISE">ENTERPRISE</option>
                    <option value="PROFESSIONAL">PROFESSIONAL</option>
                    <option value="STANDARD">STANDARD</option>
                    <option value="TRIAL">TRIAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.maxUsers")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.maxUsers}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        maxUsers: Number(e.target.value) || 1
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.expiryYears")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.expiryYears}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        expiryYears: Number(e.target.value) || 1
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {t("licenses.form.keyPrefix")}
                  </label>
                  <input
                    className="w-full border border-slate-300 rounded-md px-2.5 py-2 text-sm"
                    value={form.keyPrefix}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, keyPrefix: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {t("licenses.form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isLoading}
                  className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-70"
                >
                  {saveMutation.isLoading ? t("common.loading") : t("licenses.form.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {bulkModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content max-w-3xl">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">
              {t("licenses.bulk.title")}
            </h3>
            <div className="space-y-4 text-sm">
              <p className="text-slate-600">
                Önce örnek şablonu indirip doldurun, ardından dosyayı seçip
                önizlemeyi kontrol edin. Her satır bir lisansı temsil eder.
              </p>
              <div className="flex gap-3 flex-wrap items-center">
                <button
                  type="button"
                  onClick={handleTemplateDownload}
                  className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                >
                  {t("licenses.bulk.downloadTemplate")}
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleExcelChange}
                  className="text-xs"
                />
              </div>

              {bulkRows.length > 0 && (
                <div className="border border-slate-200 rounded-md max-h-64 overflow-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2 py-1 text-left">{t("licenses.table.company")}</th>
                        <th className="px-2 py-1 text-left">{t("licenses.table.license")}</th>
                        <th className="px-2 py-1 text-left">{t("licenses.table.maxUsers")}</th>
                        <th className="px-2 py-1 text-left">{t("licenses.table.expiryDate")}</th>
                        <th className="px-2 py-1 text-left">{t("licenses.table.customerEmail")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkRows.map((r, idx) => (
                        <tr key={idx} className="border-t border-slate-100">
                          <td className="px-2 py-1">
                            <div className="font-medium text-slate-800">
                              {r.company_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {r.company_id}
                            </div>
                          </td>
                          <td className="px-2 py-1">{r.license_type}</td>
                          <td className="px-2 py-1">{r.max_users}</td>
                          <td className="px-2 py-1">{r.expiry_date}</td>
                          <td className="px-2 py-1">{r.customer_email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkModalOpen(false);
                    setBulkRows([]);
                  }}
                  className="px-4 py-2 text-xs rounded-md border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {t("licenses.bulk.cancel")}
                </button>
                <button
                  type="button"
                  disabled={bulkRows.length === 0 || bulkMutation.isLoading}
                  onClick={() => bulkMutation.mutate()}
                  className="px-4 py-2 text-xs rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {bulkMutation.isLoading
                    ? t("common.loading")
                    : `${t("licenses.bulk.add")} (${bulkRows.length})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

