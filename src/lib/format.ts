import { store } from "./store";

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatBRL(value: number) {
  return brl.format(value);
}

export function pixPrice(total: number) {
  return total * (1 - store.pixDiscount);
}

export function installmentValue(
  total: number,
  months = store.installments,
  rate = store.monthlyInterest,
) {
  if (rate === 0) return total / months;
  return (total * rate) / (1 - Math.pow(1 + rate, -months));
}
