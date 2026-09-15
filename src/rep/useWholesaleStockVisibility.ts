import { useContext } from "react";
import { WholesaleStockVisibilityContext } from "./WholesaleStockVisibilityContext";

export function useWholesaleStockVisibility() {
  const value = useContext(WholesaleStockVisibilityContext);
  if (!value) throw new Error("useWholesaleStockVisibility must be used within WholesaleStockVisibilityProvider");
  return value;
}

export function useOptionalWholesaleStockVisibility() {
  return useContext(WholesaleStockVisibilityContext);
}
