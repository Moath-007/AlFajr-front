import { useCallback, useEffect, useState } from "react";
import { accountsService, type SaleAccountOption } from "@/api";
import { apiMessages } from "@/components/rep/repOrderUtils";

export function useGeneralSaleAccounts(enabled = true) {
  const [accounts, setAccounts] = useState<SaleAccountOption[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    accountsService.allOptions({ type: "General" }, controller.signal)
      .then((rows) => rows.map((row) => ({
        id: row.account_id,
        name: row.name,
        account_number: row.account_number,
        phone: row.phone,
      })))
      .then((rows) => { if(!controller.signal.aborted) setAccounts(rows); })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setAccounts([]);
          setError(apiMessages(reason, "تعذر تحميل الحسابات.").join("، "));
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [enabled, revision]);

  return { accounts, loading, error, reload };
}
