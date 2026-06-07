import { useRef, useState } from "react";
import Papa from "papaparse";
import { parseDate } from "../parseDate";
import { autoCat, detectCols, txnKey } from "../utils/transactions";
import { INIT_COLS } from "../hooks/useCsvImport.constants";
import type { Transaction, ColMap, ImportResult } from "../types";

export { INIT_COLS };

interface UseCsvImportOptions {
  txns: Transaction[];
  onImport: (newOnes: Transaction[], result: ImportResult) => void;
}

const DESC_BLACKLIST = [
  "MOBILE PAYMENT THANK YOU",
  "PAID",
  "PMT WELLS FARGO CC", // covered in separate WF import
  "ELECTRONIC WITHDRAWAL COMCAST-XFINITY", // covered in SplitWise import
  "VENMO", // covered in separate Venmo import
  "MONTHLY MAINTENANCE FEE", // this always gets reversed
  "PAYMENT TO CREDIT CARD 0379", // in separate import
];

export function useCsvImport({ txns, onImport }: UseCsvImportOptions) {
  const [csvStep, setCsvStep] = useState<"drop" | "map">("drop");
  const [csvHdrs, setCsvHdrs] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [colMap, setColMap] = useState<ColMap>(INIT_COLS);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | null | undefined) => {
    if (!f) return;
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        const hdrs = meta.fields || [];
        setCsvHdrs(hdrs);
        setCsvRows(data);
        setColMap(detectCols(hdrs));
        setCsvStep("map");
      },
    });
  };

  const handleBack = () => {
    setCsvStep("drop");
    setCsvHdrs([]);
    setCsvRows([]);
    setColMap(INIT_COLS);
  };

  const handleImport = () => {
    const parsed = csvRows
      .map(row => {
        const name = (row[colMap.description] || "").trim();
        const amt = parseFloat((row[colMap.amount] || "0").replace(/[$,\s]/g, "")) || 0;
        const cat = colMap.category && row[colMap.category] ? row[colMap.category] : autoCat(name);
        const date = parseDate(row[colMap.date] || "");
        return {
          id: `${date}|${amt}|${name}`,
          date,
          name,
          amount: amt,
          category: cat,
          split: 1,
          account: colMap.account ? row[colMap.account] || "" : "",
        } as Transaction;
      })
      .filter(
        t =>
          t.date &&
          t.name &&
          t.amount !== 0 &&
          !DESC_BLACKLIST.some(b => t.name.toUpperCase().includes(b)),
      );

    const existingKeys = new Set(txns.map(txnKey));
    const newOnes = parsed.filter(t => !existingKeys.has(txnKey(t)));
    onImport(newOnes, { added: newOnes.length, skipped: parsed.length - newOnes.length });
    handleBack();
  };

  const triggerFileDialog = () => fileRef.current?.click();

  return { csvStep, csvHdrs, csvRows, colMap, setColMap, fileRef, handleFile, handleBack, handleImport, triggerFileDialog };
}
