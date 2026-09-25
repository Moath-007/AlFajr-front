import { useNavigate } from "react-router-dom";
import CustomersPage from "@/components/customers/CustomersPage";

export default function RepReceivablesPage() {
  const navigate = useNavigate();
  return <div className="space-y-4"><div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900"><b className="block">حسابات الزبائن الموحّدة</b><span>اختر الزبون لمراجعة الرصيد والحركات أو إصدار سند قبض أو صرف مستقل.</span></div><CustomersPage basePath="/rep" onNavigate={(path) => navigate(path)} /></div>;
}
