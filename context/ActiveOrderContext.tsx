/**
 * ActiveOrderContext
 *
 * Shares the current active delivery order's location data between
 * the Orders tab and the smart middle-bottom Location button.
 *
 * - Before pickup  → smartLocation points to STORE (vendorCoords)
 * - After pickup   → smartLocation points to CUSTOMER (customerCoords)
 * - No active order → null (falls back to rider's own GPS screen)
 */

import React, { createContext, useContext, useState, useCallback } from "react";

export type ActiveOrderLocation = {
  orderId: string;
  orderNumber: string;
  isPickedUp: boolean;
  /** Target location to navigate TO (store or customer depending on status) */
  targetLat: number;
  targetLng: number;
  targetLabel: string; // "FreshMart - Kukatpally" or "Ravi Kumar - Madhapur"
  targetAddress: string;
};

type ActiveOrderContextType = {
  activeOrderLocation: ActiveOrderLocation | null;
  setActiveOrderLocation: (loc: ActiveOrderLocation | null) => void;
  clearActiveOrderLocation: () => void;
};

const ActiveOrderContext = createContext<ActiveOrderContextType | undefined>(undefined);

export function ActiveOrderProvider({ children }: { children: React.ReactNode }) {
  const [activeOrderLocation, setActiveOrderLocation] = useState<ActiveOrderLocation | null>(null);

  const clearActiveOrderLocation = useCallback(() => {
    setActiveOrderLocation(null);
  }, []);

  return (
    <ActiveOrderContext.Provider
      value={{ activeOrderLocation, setActiveOrderLocation, clearActiveOrderLocation }}
    >
      {children}
    </ActiveOrderContext.Provider>
  );
}

export function useActiveOrder() {
  const ctx = useContext(ActiveOrderContext);
  if (!ctx) throw new Error("useActiveOrder must be used inside ActiveOrderProvider");
  return ctx;
}
