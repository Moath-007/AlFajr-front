import { useCallback, useMemo, useState, type ReactNode } from "react";
import { WholesaleStockVisibilityContext } from "./WholesaleStockVisibilityContext";

export default function WholesaleStockVisibilityProvider({ children }: { children: ReactNode }) {
  const [showWholesaleStock, setShowWholesaleStock] = useState(false);
  const showStock = useCallback(() => setShowWholesaleStock(true), []);
  const hideStock = useCallback(() => setShowWholesaleStock(false), []);
  const resetStockVisibility = hideStock;
  const value = useMemo(() => ({ showWholesaleStock, showStock, hideStock, resetStockVisibility }), [hideStock, resetStockVisibility, showStock, showWholesaleStock]);
  return <WholesaleStockVisibilityContext.Provider value={value}>{children}</WholesaleStockVisibilityContext.Provider>;
}
