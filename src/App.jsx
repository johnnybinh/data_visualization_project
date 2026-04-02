import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { LayoffDataContext } from "@/context/LayoffDataContext";
import { loadLayoffData } from "@/lib/loadLayoffData";
import { AppLayout } from "@/components/layout/AppLayout";
import { Overview } from "@/pages/Overview";
import { YearlyBreakdown } from "@/pages/YearlyBreakdown";
import { AIEventTimeline } from "@/pages/AIEventTimeline";
import { About } from "@/pages/About";

export default function App() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadLayoffData()
      .then((rows) => {
        if (!cancelled) setRecords(rows);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e : new Error(String(e)));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <LayoffDataContext.Provider value={{ records, error, loading }}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Overview />} />
            <Route path="yearly" element={<YearlyBreakdown />} />
            <Route path="timeline" element={<AIEventTimeline />} />
            <Route path="about" element={<About />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LayoffDataContext.Provider>
  );
}
