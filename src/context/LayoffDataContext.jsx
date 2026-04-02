import { createContext, useContext } from "react";

/** @type {React.Context<{ records: Array<{ company: string, laidOff: number, date: Date, year: number, industry: string }> | null, error: Error | null, loading: boolean } | null>} */
export const LayoffDataContext = createContext(null);

export function useLayoffData() {
  const ctx = useContext(LayoffDataContext);
  if (!ctx) throw new Error("useLayoffData must be used within provider");
  return ctx;
}
