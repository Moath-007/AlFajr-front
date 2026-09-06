import { useState } from 'react';
import {
  LayoutDashboard, Package, Boxes, Users, ClipboardList, BarChart3,
  Settings, LogOut, Menu, X, Store, Sparkles,
} from 'lucide-react';

interface OwnerSidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { id: 'products', label: 'المنتجات', icon: Package },
  { id: 'categories', label: 'التصنيفات', icon: Boxes },
  { id: 'inventory', label: 'المخزون', icon: Boxes },
  { id: 'reps', label: 'المناديب', icon: Users },
  { id: 'orders', label: 'الطلبات', icon: ClipboardList },
  { id: 'reports', label: 'التقارير', icon: BarChart3 },
  { id: 'settings', label: 'إعدادات المحل', icon: Settings },
];

export default function OwnerSidebar({ currentPage, onNavigate, onLogout }: OwnerSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
      <>
        {/* زر القائمة للجوال بالهوية الخضراء الفاخرة */}
        <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden fixed top-4 right-4 z-30 rounded-2xl bg-emerald-950 text-amber-400 p-3 shadow-lg border border-emerald-800 flex items-center justify-center backdrop-blur-md"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* خلفية مظلمة عند فتح القائمة للجوال */}
        {mobileOpen && (
            <div className="lg:hidden fixed inset-0 z-30 bg-emerald-950/70 backdrop-blur-xs transition-opacity" onClick={() => setMobileOpen(false)} />
        )}

        {/* الشريط الجانبي لصاحب المحل */}
        <aside
            className={`fixed lg:sticky top-0 right-0 z-40 h-screen w-64 bg-emerald-950 text-emerald-100 flex flex-col border-l border-emerald-900/80 transition-transform duration-300 lg:translate-x-0 ${
                mobileOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
            }`}
        >
          {/* الهيدر وشعار الشركة */}
          <div className="flex items-center justify-between p-6 border-b border-emerald-900/60">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-emerald-950 font-black text-xl shadow-md">
                ف
              </div>
              <div>
                <div className="text-white font-black text-sm tracking-wide">شركة الفجر</div>
                <div className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1 mt-0.5">
                  <Sparkles className="h-3 w-3" />
                  <span>لوحة التحكم</span>
                </div>
              </div>
            </div>
            <button onClick={() => setMobileOpen(false)} className="lg:hidden text-emerald-300 hover:text-white p-1 rounded-xl bg-emerald-900">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* بطاقة معلومات صاحب المحل */}
          <div className="mx-4 my-4 p-3.5 rounded-2xl bg-emerald-900/50 border border-emerald-800/60 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-400 text-xs font-black border border-amber-500/30">
              <Store className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] font-bold text-emerald-400">الحساب الرئيسي</div>
              <div className="text-xs font-black text-white truncate">صاحب المحل</div>
            </div>
          </div>

          {/* القائمة الرئيسية */}
          <nav className="flex-1 overflow-y-auto px-4 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-800">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                  <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                          isActive
                              ? 'bg-amber-500 text-emerald-950 font-black shadow-lg shadow-amber-500/20 scale-[1.02]'
                              : 'text-emerald-300/80 hover:bg-emerald-900/60 hover:text-white'
                      }`}
                  >
                    <item.icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-emerald-950' : 'text-amber-400'}`} />
                    <span>{item.label}</span>
                  </button>
              );
            })}
          </nav>

          {/* زر تسجيل الخروج */}
          <div className="p-4 border-t border-emerald-900/60">
            <button
                onClick={onLogout}
                className="flex items-center gap-3.5 w-full px-4 py-3 rounded-2xl text-xs font-bold text-rose-300 hover:bg-rose-500/15 hover:text-rose-200 transition-all border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="h-5 w-5 shrink-0 text-rose-400" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </aside>
      </>
  );
}