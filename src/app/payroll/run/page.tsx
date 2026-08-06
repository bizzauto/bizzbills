"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function PayrollRunPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<{ id: string; name: string; salary: number; code: string }[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employees").then((r) => r.json()).then((d) => setEmployees(Array.isArray(d) ? d : []));
  }, []);

  async function handleRun() {
    const res = await fetch("/api/payroll-runs", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeIds: selected, month, year }),
    });
    const data = await res.json();
    if (data.count) {
      setResult(`Payroll run created for ${data.count} employees.`);
      setTimeout(() => router.push("/payroll"), 1500);
    } else {
      setResult(data.error || "Error creating payroll run");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Run Payroll</h1>
          <Link href="/payroll" className="text-xs text-cyan-400 hover:underline">&larr; Payroll</Link>
        </div>

        <div className="mb-6 flex gap-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Month</label>
            <select value={month} onChange={(e) => setMonth(parseInt(e.target.value))} className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">Year</label>
            <input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value))} className="w-24 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" />
          </div>
        </div>

        <div className="mb-4 space-y-2">
          {employees.filter((e) => e.salary > 0).map((emp) => (
            <label key={emp.id} className="flex items-center gap-3 rounded-lg bg-slate-800/50 p-3 cursor-pointer">
              <input type="checkbox" checked={selected.includes(emp.id)} onChange={() => setSelected(selected.includes(emp.id) ? selected.filter((s) => s !== emp.id) : [...selected, emp.id])} className="accent-cyan-500" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">{emp.name} <span className="text-xs text-slate-500">({emp.code})</span></p>
                <p className="text-xs text-slate-400">₹{emp.salary.toLocaleString()}</p>
              </div>
            </label>
          ))}
        </div>

        <button onClick={handleRun} disabled={selected.length === 0} className="rounded-lg bg-cyan-600 px-6 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-50">
          Generate Payroll ({selected.length} employees)
        </button>
        {result && <p className="mt-4 text-sm text-emerald-400">{result}</p>}
      </div>
    </div>
  );
}
