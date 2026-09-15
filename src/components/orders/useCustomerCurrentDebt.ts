import { useEffect, useState } from "react";
import { customersService } from "@/api";

export function useCustomerCurrentDebt(phone?: string | null, enabled = true) {
  const [debt, setDebt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    setDebt(null);
    setFailed(false);
    setLoading(false);
    if (!enabled || !phone?.trim()) return;
    const controller = new AbortController();
    setLoading(true);
    customersService.findByPhone(phone, controller.signal)
      .then((response) => setDebt(response.customer.total_outstanding_amount))
      .catch(() => {
        if (!controller.signal.aborted) {
          setDebt(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, phone]);
  return { debt, loading, failed };
}
