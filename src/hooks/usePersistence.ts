import { useEffect, useState } from "react";
import { DEFAULT_CATEGORIES } from "../constants";
import type { Transaction, Category } from "../types";

const STORAGE_KEY = "fw9";
const LEGACY_KEY = "fw8";

interface StorageData {
  txns: Transaction[];
  cats: Category[];
}

export function usePersistence(
  txns: Transaction[],
  cats: Category[],
  setTxns: (t: Transaction[]) => void,
  setCats: (c: Category[]) => void,
): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d: StorageData = JSON.parse(raw);
        setTxns(d.txns || []);
        setCats(d.cats || DEFAULT_CATEGORIES);
      } else {
        // Migrate from the legacy flat-category schema: keep transactions (their
        // category labels still match), seed the new default category tree.
        const legacy = localStorage.getItem(LEGACY_KEY);
        if (legacy) {
          const d = JSON.parse(legacy) as { txns?: Transaction[] };
          setTxns(d.txns || []);
          setCats(DEFAULT_CATEGORIES);
        }
      }
    } catch (e) {
      console.warn("Failed to load saved data:", e);
    }
    setLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ txns, cats }));
    } catch (e) {
      console.warn("Failed to save data:", e);
    }
  }, [txns, cats, loaded]);

  return { loaded };
}
