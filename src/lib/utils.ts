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
