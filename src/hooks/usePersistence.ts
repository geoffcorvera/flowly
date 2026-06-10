import { useEffect, useState } from "react";
import { INIT_CATS, DEFAULT_SANKEY_CONFIG } from "../constants";
import type { Transaction, Category, SankeyDiagramConfig } from "../types";

const STORAGE_KEY = "fw8";

interface StorageData {
  txns: Transaction[];
  cats: Category[];
  sankeyConfig?: SankeyDiagramConfig;
}

export function usePersistence(
  txns: Transaction[],
  cats: Category[],
  sankeyConfig: SankeyDiagramConfig,
  setTxns: (t: Transaction[]) => void,
  setCats: (c: Category[]) => void,
  setSankeyConfig: (c: SankeyDiagramConfig) => void,
): { loaded: boolean } {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const d: StorageData = JSON.parse(raw);
        setTxns(d.txns || []);
        setCats(d.cats || INIT_CATS);
        setSankeyConfig(d.sankeyConfig || DEFAULT_SANKEY_CONFIG);
      }
    } catch (e) {
      console.warn("Failed to load saved data:", e);
    }
    setLoaded(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ txns, cats, sankeyConfig }));
    } catch (e) {
      console.warn("Failed to save data:", e);
    }
  }, [txns, cats, sankeyConfig, loaded]);

  return { loaded };
}
