"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { KES_PER_USD } from "@/types";

type Currency = "KES" | "USD";

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  exchangeRate: number; // 1 USD = X KES
  formatPrice: (amountInUsd: number, showDecimals?: boolean) => string;
  convertFromUsd: (amountInUsd: number) => number;
  convertToUsd: (amountInCurrentCurrency: number) => number;
}

const EXCHANGE_RATE_USD_TO_KES = KES_PER_USD;

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "KES",
  setCurrency: () => {},
  exchangeRate: EXCHANGE_RATE_USD_TO_KES,
  formatPrice: (amt) => `Ksh ${Math.round(amt * EXCHANGE_RATE_USD_TO_KES).toLocaleString()}`,
  convertFromUsd: (amt) => Math.round(amt * EXCHANGE_RATE_USD_TO_KES),
  convertToUsd: (amt) => Number((amt / EXCHANGE_RATE_USD_TO_KES).toFixed(2)),
});

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currency, setCurrencyState] = useState<Currency>("KES");

  useEffect(() => {
    const saved = localStorage.getItem("herlooku_currency") as Currency;
    if (saved === "KES" || saved === "USD") {
      setCurrencyState(saved);
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem("herlooku_currency", c);
  };

  const convertFromUsd = (amountInUsd: number) => {
    if (currency === "KES") {
      return Math.round(amountInUsd * EXCHANGE_RATE_USD_TO_KES);
    }
    return amountInUsd;
  };

  const convertToUsd = (amountInCurrentCurrency: number) => {
    if (currency === "KES") {
      return Number((amountInCurrentCurrency / EXCHANGE_RATE_USD_TO_KES).toFixed(2));
    }
    return amountInCurrentCurrency;
  };

  const formatPrice = (amountInUsd: number, showDecimals: boolean = false): string => {
    if (isNaN(amountInUsd) || amountInUsd == null) return currency === "KES" ? "Ksh 0" : "$0";

    if (currency === "KES") {
      const kesVal = Math.round(amountInUsd * EXCHANGE_RATE_USD_TO_KES);
      return `Ksh ${kesVal.toLocaleString()}`;
    }

    // USD
    return showDecimals || amountInUsd % 1 !== 0
      ? `$${amountInUsd.toFixed(2)}`
      : `$${Math.round(amountInUsd)}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        setCurrency,
        exchangeRate: EXCHANGE_RATE_USD_TO_KES,
        formatPrice,
        convertFromUsd,
        convertToUsd,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

export const CurrencySelector: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { currency, setCurrency } = useCurrency();

  return (
    <div className={`inline-flex items-center rounded-xl bg-white/5 p-0.5 border border-white/10 text-[11px] font-bold ${className}`}>
      <button
        type="button"
        onClick={() => setCurrency("KES")}
        className={`px-2 py-0.5 rounded-lg transition-all ${
          currency === "KES"
            ? "bg-brand-600 text-white shadow-sm font-black"
            : "text-slate-400 hover:text-white"
        }`}
      >
        KES
      </button>
      <button
        type="button"
        onClick={() => setCurrency("USD")}
        className={`px-2 py-0.5 rounded-lg transition-all ${
          currency === "USD"
            ? "bg-brand-600 text-white shadow-sm font-black"
            : "text-slate-400 hover:text-white"
        }`}
      >
        USD
      </button>
    </div>
  );
};
