"use client";

import { useState, useEffect } from "react";

export interface WeeklyInventory {
  soldThisWeek: number;
  cap: number;
  available: number;
}

export function useWeeklyInventory() {
  const [data, setData] = useState<WeeklyInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/weekly-inventory")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.error) {
          setError(json.error);
          setData({ soldThisWeek: 0, cap: 10, available: 10 });
        } else {
          setData(json);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
        setData({ soldThisWeek: 0, cap: 10, available: 10 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
