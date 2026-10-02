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
    (async () => {
      const result: SaleAccountOption[] = [];
      let page=1,totalPages=1;
      do { const response=await accountsService.options({type:"General",page,limit:100},controller.signal); result.push(...response.items.map(row=>({id:row.account_id,name:row.name,account_number:row.account_number,phone:row.phone}))); totalPages=response.pagination.total_pages; page++; } while(page<=totalPages && !controller.signal.aborted);
      return result;
    })()
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
