import type { ReactNode } from "react";

export const inputCls = "rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm";
export const btnCls = "rounded-lg bg-brand px-3 py-1.5 text-sm font-semibold text-white";
export const ghostBtn = "rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold";

export function H1({ children }: { children: ReactNode }) {
  return <h1 className="mb-4 text-xl font-bold text-brand">{children}</h1>;
}
export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="mb-5 rounded-xl border border-gray-200 bg-white p-4">
      {title && <h2 className="mb-3 font-bold text-brand">{title}</h2>}
      {children}
    </section>
  );
}
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-200 text-xs uppercase text-gray-500">
            {head.map((h) => (
              <th key={h} className="px-2 py-1.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:px-2 [&_td]:py-1.5 [&_tr]:border-b [&_tr]:border-gray-100">{children}</tbody>
      </table>
    </div>
  );
}
export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-2xl font-extrabold text-brand">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
export const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
