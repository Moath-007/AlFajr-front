import { createContext } from "react";

export interface WholesaleStockVisibilityValue {
  showWholesaleStock: boolean;
  showStock: () => void;
  hideStock: () => void;
  resetStockVisibility: () => void;
}

export const WholesaleStockVisibilityContext = createContext<WholesaleStockVisibilityValue | null>(null);
