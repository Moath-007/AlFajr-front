import { useNavigate } from "react-router-dom";
import CustomersPage from "@/components/customers/CustomersPage";

export default function AdminReceivablesPage() {
  const navigate = useNavigate();
  return <div className="space-y-4"><div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><b className="block">حسابات الزبائن الموحّدة</b><span>الرصيد الموجب مطلوب من الزبون، والسالب مستحق له. افتح الحساب لإنشاء سند قبض أو صرف ومراجعة كامل الحركات.</span></div><CustomersPage basePath="/owner" onNavigate={(path) => navigate(path)} /></div>;
}
