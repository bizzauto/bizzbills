"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Warehouse = { id: string; name: string; address: string; city: string; state: string; isActive: boolean; inventory: { id: string; product: { name: string }; quantity: number }[] };

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    fetch("/api/warehouses").then((r) => r.json()).then(setWarehouses);
  }, []);

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Inventory</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Warehouses</h1>
          </div>
          <Link href="/inventory/warehouses/new" className="rounded-full bg-cyan-500 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400">+ Add Warehouse</Link>
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        {warehouses.length === 0 && <p className="col-span-2 text-sm text-slate-500">No warehouses yet.</p>}
        {warehouses.map((w) => (
          <div key={w.id} className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-white">{w.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${w.isActive ? "bg-emerald-500/10 text-emerald-300" : "bg-slate-500/10 text-slate-400"}`}>{w.isActive ? "Active" : "Inactive"}</span>
            </div>
            {(w.address || w.city) && <p className="text-xs text-slate-400">{w.address}{w.city ? `, ${w.city}` : ""}{w.state ? `, ${w.state}` : ""}</p>}
            <p className="text-xs text-slate-500 mt-1">{w.inventory.length} product{w.inventory.length !== 1 ? "s" : ""}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
