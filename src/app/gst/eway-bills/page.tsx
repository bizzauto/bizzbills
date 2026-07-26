"use client";

import { useState, useEffect } from "react";

interface EwayBill {
  id: string;
  ewbNumber: string;
  ewbDate: string;
  fromAddress: string;
  toAddress: string;
  transportMode: string;
  vehicleNumber: string | null;
  distance: number;
  status: string;
  invoiceId: string | null;
  createdAt: string;
}

export default function EwayBillsPage() {
  const [bills, setBills] = useState<EwayBill[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    invoiceId: "",
    ewbNumber: "",
    fromAddress: "",
    toAddress: "",
    transportMode: "road",
    vehicleNumber: "",
    distance: 0,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/gst/eway-bills")
      .then((r) => r.json())
      .then(setBills);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/gst/eway-bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          distance: Number(form.distance),
        }),
      });
      if (!res.ok) throw new Error("Failed to create e-way bill");
      const newBill = await res.json();
      setBills([newBill, ...bills]);
      setShowForm(false);
      setForm({ invoiceId: "", ewbNumber: "", fromAddress: "", toAddress: "", transportMode: "road", vehicleNumber: "", distance: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this e-way bill?")) return;
    await fetch(`/api/gst/eway-bills/${id}`, { method: "DELETE" });
    setBills(bills.filter((b) => b.id !== id));
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-10">
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">E-Way Bills</h1>
          <p className="mt-1 text-sm text-slate-400">Generate and track electronic way bills for interstate shipping</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
        >
          + New E-Way Bill
        </button>
      </section>

      {showForm && (
        <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <h2 className="text-lg font-semibold text-white">New E-Way Bill</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Invoice ID</span>
              <input value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} placeholder="Invoice ID" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">E-Way Bill Number</span>
              <input value={form.ewbNumber} onChange={(e) => setForm({ ...form, ewbNumber: e.target.value })} placeholder="E.g. EWB2026072600001" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">From Address</span>
              <input value={form.fromAddress} onChange={(e) => setForm({ ...form, fromAddress: e.target.value })} placeholder="Origin address" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">To Address</span>
              <input value={form.toAddress} onChange={(e) => setForm({ ...form, toAddress: e.target.value })} placeholder="Destination address" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Transport Mode</span>
              <select value={form.transportMode} onChange={(e) => setForm({ ...form, transportMode: e.target.value })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0">
                <option value="road">Road</option>
                <option value="rail">Rail</option>
                <option value="air">Air</option>
                <option value="ship">Ship</option>
              </select>
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Vehicle Number</span>
              <input value={form.vehicleNumber} onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })} placeholder="e.g. MH12AB1234" className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0 placeholder:text-slate-500" />
            </label>
            <label className="text-sm text-slate-300">
              <span className="mb-1 block text-slate-400">Distance (km)</span>
              <input type="number" value={form.distance} onChange={(e) => setForm({ ...form, distance: Number(e.target.value) })} className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-white outline-none ring-0" />
            </label>
          </div>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={handleSave} disabled={saving} className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50">
              {saving ? "Saving..." : "Create E-Way Bill"}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
              Cancel
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-800/80 text-left text-slate-300">
              <tr>
                <th className="p-3">EWB Number</th>
                <th className="p-3">Invoice</th>
                <th className="p-3">From</th>
                <th className="p-3">To</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Vehicle</th>
                <th className="p-3">Distance</th>
                <th className="p-3">Status</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id} className="border-t border-white/10 bg-slate-900/50">
                  <td className="p-3 font-mono text-white text-xs">{bill.ewbNumber}</td>
                  <td className="p-3 text-slate-200 text-xs">{bill.invoiceId ?? "—"}</td>
                  <td className="p-3 text-slate-300 text-xs max-w-[120px] truncate">{bill.fromAddress}</td>
                  <td className="p-3 text-slate-300 text-xs max-w-[120px] truncate">{bill.toAddress}</td>
                  <td className="p-3 text-slate-400 uppercase text-xs">{bill.transportMode}</td>
                  <td className="p-3 text-slate-300">{bill.vehicleNumber ?? "—"}</td>
                  <td className="p-3 text-slate-300">{bill.distance} km</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${bill.status === "generated" ? "bg-emerald-500/15 text-emerald-300" : bill.status === "cancelled" ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <button onClick={() => handleDelete(bill.id)} className="text-xs text-red-400 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr><td colSpan={9} className="p-6 text-center text-slate-400">No e-way bills yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}