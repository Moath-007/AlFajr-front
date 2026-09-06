import { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, ShieldCheck } from 'lucide-react';
import { ApiError, type LoginUserResponseDto } from '@/api';

interface LoginPageProps {
  onLogin: (email: string, password: string) => Promise<LoginUserResponseDto>;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generalErrors, setGeneralErrors] = useState<string[]>([]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'الرجاء إدخال البريد الإلكتروني';
    else if (!/^\S+@\S+\.\S+$/.test(email)) e.email = 'البريد الإلكتروني غير صالح';
    if (!password) e.password = 'الرجاء إدخال كلمة المرور';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralErrors([]);
    if (!validate()) return;
    setLoading(true);

    try {
      await onLogin(email.trim(), password);
    } catch (error) {
      if (error instanceof ApiError) {
        setGeneralErrors(error.messages);
      } else {
        setGeneralErrors(['تعذر الاتصال بالخادم، يرجى المحاولة مرة أخرى']);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100/70 p-4 transition-opacity duration-500 opacity-100">
        <div className="w-full max-w-md transform transition-all duration-300 hover:scale-[1.01]">

          {/* زر الرجوع */}
          <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-brand mb-4 transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180 group-hover:-translate-x-1 transition-transform" />
            <span>رجوع للموقع</span>
          </button>

          {/* بطاقة تسجيل الدخول */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl border border-stone-200/80 shadow-xl shadow-stone-200/50">

            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-amber-400 shadow-md">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-stone-900">تسجيل الدخول</h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 font-medium">شركة الفجر للصناعة والتجارة</p>
            </div>

            {generalErrors.length > 0 && (
                <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-bold animate-fade-in flex items-start gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <ul className="space-y-1">
                    {generalErrors.map((message) => <li key={message}>{message}</li>)}
                  </ul>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="label font-bold text-stone-700 mb-1 block text-sm">البريد الإلكتروني</label>
                <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`input w-full pr-12 pl-4 py-3 rounded-xl border ${errors.email ? 'border-red-500' : 'border-stone-200'} focus:outline-none focus:border-brand transition-all text-sm font-medium`}
                      placeholder="أدخل البريد الإلكتروني"
                      autoComplete="email"
                      dir="ltr"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email}</p>}
              </div>

              <div>
                <label className="label font-bold text-stone-700 mb-1 block text-sm">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
                  <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`input w-full pr-12 pl-12 py-3 rounded-xl border ${errors.password ? 'border-red-500' : 'border-stone-200'} focus:outline-none focus:border-brand transition-all text-sm font-medium`}
                      placeholder="أدخل كلمة المرور"
                      autoComplete="current-password"
                      dir="ltr"
                  />
                  <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-brand transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password}</p>}
              </div>

              <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full !py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 shadow-md hover:opacity-95 transition-all text-base"
              >
                {loading ? (
                    <span className="flex items-center gap-2">
                  <span className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الدخول...
                </span>
                ) : (
                    'تسجيل الدخول'
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
  );
}
