import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function parseCurrencyStr(val: string): number {
  if (!val) return 0;
  let str = val.replace(/[^\d,.-]/g, "");
  if (str.includes('.') && str.includes(',')) {
    return Number(str.replace(/\./g, "").replace(",", "."));
  }
  if (str.includes(',')) {
    return Number(str.replace(",", "."));
  }
  if (str.includes('.')) {
    const dotsCount = (str.match(/\./g) || []).length;
    if (dotsCount > 1) {
      return Number(str.replace(/\./g, ""));
    }
    const parts = str.split('.');
    if (parts[1] && parts[1].length === 3) {
      return Number(str.replace(/\./g, ""));
    }
    return Number(str);
  }
  return Number(str);
}

export function getPaymentDate(item: {
  paid_at?: string | null;
  created_at?: string | null;
  data_agendamento?: string | null;
  data_venda?: string | null;
}): string {
  if (item.data_venda) return item.data_venda;
  const iso = item.paid_at || item.created_at;
  if (!iso) return item.data_agendamento || "";
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).split("T")[0] || item.data_agendamento || "";
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split("T")[0];
  } catch {
    return String(iso).split("T")[0] || item.data_agendamento || "";
  }
}

