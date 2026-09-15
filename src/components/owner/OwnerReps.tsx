import { useState, useMemo } from "react";
import {
  Plus,
  Pencil,
  Eye,
  UserCheck,
  UserX,
  Users,
  Search,
  Phone,
  Mail,
} from "lucide-react";
import type { Representative, Order } from "@/types";
import Modal from "@/components/ui/Modal";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface OwnerRepsProps {
  reps: Representative[];
  orders: Order[];
  onAdd: (r: Omit<Representative, "id" | "createdAt">) => void;
  onUpdate: (id: string, updates: Partial<Representative>) => void;
  onToggle: (id: string) => void;
  onNotify: (msg: string, type?: "success" | "error" | "info") => void;
}

export default function OwnerReps({
  reps,
  orders,
  onAdd,
  onUpdate,
  onToggle,
  onNotify,
}: OwnerRepsProps) {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Representative | null>(null);
  const [viewing, setViewing] = useState<Representative | null>(null);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    username: "",
    password: "",
    email: "",
    active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toggleTarget, setToggleTarget] = useState<Representative | null>(null);
  const [confirmSave, setConfirmSave] = useState(false);

  const filtered = useMemo(() => {
    return reps.filter(
      (r) =>
        !search ||
        r.name.includes(search) ||
        r.username.includes(search) ||
        r.phone.includes(search),
    );
  }, [reps, search]);

  const openAdd = () => {
    setEditing(null);
    setForm({
      name: "",
      phone: "",
      username: "",
      password: "",
      email: "",
      active: true,
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (r: Representative) => {
    setEditing(r);
    setForm({
      name: r.name,
      phone: r.phone,
      username: r.username,
      password: r.password,
      email: r.email,
      active: r.active,
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "الرجاء إدخال الاسم";
    if (!form.phone.trim()) e.phone = "الرجاء إدخال رقم الهاتف";
    else if (!/^0\d{9,10}$/.test(form.phone.replace(/\s/g, "")))
      e.phone = "رقم الهاتف غير صحيح";
    if (!form.username.trim()) e.username = "الرجاء إدخال اسم المستخدم";
    if (!form.password.trim()) e.password = "الرجاء إدخال كلمة المرور";
    if (!form.email.trim()) e.email = "الرجاء إدخال البريد الإلكتروني";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = "البريد الإلكتروني غير صحيح";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setConfirmSave(true);
  };

  const saveRepresentative = () => {
    if (editing) {
      onUpdate(editing.id, form);
      onNotify("تم تحديث بيانات المندوب بنجاح");
    } else {
      onAdd(form);
      onNotify("تم إضافة المندوب بنجاح");
    }
    setConfirmSave(false);
    setModalOpen(false);
  };

  const repOrderCount = (repId: string) =>
    orders.filter((o) => o.repId === repId).length;

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* رأس الصفحة الفخم */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold mb-2 border border-amber-500/20">
            <Users className="h-3.5 w-3.5" />
            <span>فريق العمل</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
            إدارة المناديب
          </h1>
          <p className="text-stone-500 mt-1 text-sm font-medium">
            عرض ومتابعة مناديب المبيعات ({reps.length} مندوب مسجل)
          </p>
        </div>

        <button
          onClick={openAdd}
          className="btn-gold !py-3 !px-5 rounded-xl font-bold flex items-center gap-2 shadow-sm hover:scale-[1.02] transition-transform"
        >
          <Plus className="h-5 w-5" />
          <span>إضافة مندوب جديد</span>
        </button>
      </div>

      {/* شريط البحث */}
      <div className="bg-white p-4 sm:p-5 rounded-3xl border border-stone-200/80 shadow-xs">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث بالاسم أو اسم المستخدم أو الهاتف..."
            className="input w-full pr-12 pl-4 py-3 rounded-2xl border border-stone-200 focus:outline-none focus:border-brand text-sm font-medium bg-stone-50/50 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* الجدول أو حالة الفراغ */}
      {filtered.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-stone-200/80 shadow-xs">
          <EmptyState
            icon={<Users className="h-10 w-10 text-amber-600" />}
            title="لا يوجد مناديب مطابقين"
            description="لم يتم العثور على مناديب تطابق بحثك الحالي."
          />
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-stone-50/80 text-stone-400 text-xs border-b border-stone-100">
                <tr>
                  <th className="px-5 py-4 text-right font-bold">الاسم</th>
                  <th className="px-5 py-4 text-right font-bold">الهاتف</th>
                  <th className="px-5 py-4 text-right font-bold">
                    اسم المستخدم
                  </th>
                  <th className="px-5 py-4 text-right font-bold">البريد</th>
                  <th className="px-5 py-4 text-right font-bold">الحالة</th>
                  <th className="px-5 py-4 text-right font-bold">
                    عدد الطلبات
                  </th>
                  <th className="px-5 py-4 text-center font-bold">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50 font-medium">
                {filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-stone-50/80 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-900 text-white font-black text-sm shadow-xs">
                          {r.name.charAt(0)}
                        </div>
                        <span className="font-black text-stone-900">
                          {r.name}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-5 py-4 text-stone-600 font-bold"
                      dir="ltr"
                    >
                      {r.phone}
                    </td>
                    <td
                      className="px-5 py-4 text-stone-600 font-bold"
                      dir="ltr"
                    >
                      {r.username}
                    </td>
                    <td className="px-5 py-4 text-stone-500 text-xs" dir="ltr">
                      {r.email}
                    </td>
                    <td className="px-5 py-4">
                      {r.active ? (
                        <span className="badge-green">نشط</span>
                      ) : (
                        <span className="badge-gray">غير نشط</span>
                      )}
                    </td>
                    <td className="px-5 py-4 font-black text-amber-600">
                      {repOrderCount(r.id)} طلبات
                    </td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-1.5 bg-stone-50 p-1 rounded-xl border border-stone-200/60 w-fit mx-auto">
                        <button
                          onClick={() => setViewing(r)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="عرض"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEdit(r)}
                          className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
                          title="تعديل"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setToggleTarget(r)}
                          className={`p-2 rounded-lg transition-colors ${r.active ? "text-rose-600 hover:bg-rose-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                          title={r.active ? "تعطيل" : "تفعيل"}
                        >
                          {r.active ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* نافذة الإضافة أو التعديل الفخمة */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "تعديل بيانات المندوب" : "إضافة مندوب جديد"}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-5 pt-2">
          <div>
            <label className="block text-xs font-bold text-stone-600 mb-1.5">
              الاسم الكامل
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={`w-full px-4 py-3 rounded-2xl border ${errors.name ? "border-rose-500 bg-rose-50/20" : "border-stone-200 bg-stone-50/50 focus:bg-white"} focus:outline-none focus:border-brand text-sm font-bold transition-all`}
              placeholder="أحمد محمد"
            />
            {errors.name && (
              <p className="text-xs text-rose-600 mt-1.5 font-bold">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                رقم الهاتف
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={`w-full px-4 py-3 rounded-2xl border ${errors.phone ? "border-rose-500 bg-rose-50/20" : "border-stone-200 bg-stone-50/50 focus:bg-white"} focus:outline-none focus:border-brand text-sm font-bold transition-all`}
                placeholder="05xxxxxxxx"
                dir="ltr"
              />
              {errors.phone && (
                <p className="text-xs text-rose-600 mt-1.5 font-bold">
                  {errors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={`w-full px-4 py-3 rounded-2xl border ${errors.email ? "border-rose-500 bg-rose-50/20" : "border-stone-200 bg-stone-50/50 focus:bg-white"} focus:outline-none focus:border-brand text-sm font-bold transition-all`}
                placeholder="example@mail.com"
                dir="ltr"
              />
              {errors.email && (
                <p className="text-xs text-rose-600 mt-1.5 font-bold">
                  {errors.email}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className={`w-full px-4 py-3 rounded-2xl border ${errors.username ? "border-rose-500 bg-rose-50/20" : "border-stone-200 bg-stone-50/50 focus:bg-white"} focus:outline-none focus:border-brand text-sm font-bold transition-all`}
                placeholder="ahmed"
                dir="ltr"
              />
              {errors.username && (
                <p className="text-xs text-rose-600 mt-1.5 font-bold">
                  {errors.username}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-600 mb-1.5">
                كلمة المرور
              </label>
              <input
                type="text"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className={`w-full px-4 py-3 rounded-2xl border ${errors.password ? "border-rose-500 bg-rose-50/20" : "border-stone-200 bg-stone-50/50 focus:bg-white"} focus:outline-none focus:border-brand text-sm font-bold transition-all`}
                placeholder="••••••"
                dir="ltr"
              />
              {errors.password && (
                <p className="text-xs text-rose-600 mt-1.5 font-bold">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-5 py-3 rounded-2xl text-stone-600 hover:bg-stone-100 text-sm font-bold transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="btn-gold !py-3 !px-6 rounded-2xl font-bold shadow-sm"
            >
              {editing ? "حفظ التعديلات" : "إضافة المندوب"}
            </button>
          </div>
        </form>
      </Modal>

      {/* نافذة عرض تفاصيل المندوب الفخمة */}
      <Modal
        open={!!viewing}
        onClose={() => setViewing(null)}
        title="تفاصيل المندوب"
        size="md"
      >
        {viewing && (
          <div className="space-y-6 pt-2">
            <div className="flex items-center gap-4 bg-stone-50/80 p-5 rounded-2xl border border-stone-200/60">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-white text-2xl font-black shadow-xs">
                {viewing.name.charAt(0)}
              </div>
              <div>
                <div className="text-xl font-black text-stone-900 mb-1">
                  {viewing.name}
                </div>
                <span className={viewing.active ? "badge-green" : "badge-gray"}>
                  {viewing.active ? "حساب نشط" : "حساب معطل"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3.5 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/60">
                <Phone className="h-5 w-5 text-amber-600" />
                <span className="text-stone-700 font-bold" dir="ltr">
                  {viewing.phone}
                </span>
              </div>

              <div className="flex items-center gap-3 p-4 rounded-2xl bg-stone-50/80 border border-stone-200/60">
                <Mail className="h-5 w-5 text-amber-600" />
                <span className="text-stone-700 font-bold" dir="ltr">
                  {viewing.email}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/60 flex items-center justify-between">
                <span className="text-stone-400 font-bold text-xs">
                  اسم المستخدم:
                </span>
                <strong className="text-stone-900 font-black" dir="ltr">
                  {viewing.username}
                </strong>
              </div>

              <div className="p-4 rounded-2xl bg-stone-50/80 border border-stone-200/60 flex items-center justify-between">
                <span className="text-stone-400 font-bold text-xs">
                  تاريخ الانضمام:
                </span>
                <strong className="text-stone-800 font-bold">
                  {viewing.createdAt}
                </strong>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200/60 flex items-center justify-between">
                <span className="text-amber-800 font-bold text-xs">
                  إجمالي الطلبات المنفذة:
                </span>
                <strong className="text-amber-700 font-black text-base">
                  {repOrderCount(viewing.id)} طلب
                </strong>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        onConfirm={() => {
          if (!toggleTarget) return;
          onToggle(toggleTarget.id);
          onNotify(
            toggleTarget.active ? "تم تعطيل المندوب" : "تم تفعيل المندوب",
            "info",
          );
          setToggleTarget(null);
        }}
        severity={toggleTarget?.active ? "destructive" : "normal"}
        title={toggleTarget?.active ? "تعطيل المندوب" : "تفعيل المندوب"}
        message={`هل أنت متأكد أنك تريد ${toggleTarget?.active ? "تعطيل" : "تفعيل"} حساب المندوب "${toggleTarget?.name ?? ""}"؟`}
        confirmLabel={toggleTarget?.active ? "تعطيل الحساب" : "تفعيل الحساب"}
      />
      <ConfirmDialog
        open={confirmSave}
        onClose={() => setConfirmSave(false)}
        onConfirm={saveRepresentative}
        severity="normal"
        title={editing ? "تأكيد تحديث المندوب" : "تأكيد إضافة المندوب"}
        message={
          editing
            ? "هل أنت متأكد أنك تريد حفظ بيانات المندوب؟ قد يتضمن ذلك تغيير كلمة المرور."
            : "هل أنت متأكد أنك تريد إضافة هذا المندوب؟"
        }
        confirmLabel={editing ? "حفظ التعديلات" : "إضافة المندوب"}
      />
    </div>
  );
}
