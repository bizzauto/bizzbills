"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PayrollPage() {
  const [tab, setTab] = useState<"employees" | "runs">("employees");
  const [employees, setEmployees] = useState<{ id: string; code: string; name: string; department: string; designation: string; salary: number; isActive: boolean }[]>([]);
  const [runs, setRuns] = useState<{ id: string; month: number; year: number; employee: { name: string }; grossPay: number; deductions: number; netPay: number; status: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", department: "", designation: "", salary: "", bankName: "", accountNumber: "", ifscCode: "" });

  async function load() {
    const [e, r] = await Promise.all([fetch("/api/employees").then((r) => r.json()), fetch("/api/payroll-runs").then((r) => r.json())]);
    setEmployees(e);
    setRuns(r);
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employees", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, salary: parseFloat(form.salary) || 0 }) });
    setShowForm(false);
    setForm({ code: "", name: "", department: "", designation: "", salary: "", bankName: "", accountNumber: "", ifscCode: "" });
    load();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Payroll</h1>
          <Link href="/dashboard" className="text-xs text-cyan-400 hover:underline">&larr; Dashboard</Link>
        </div>

        <div className="mb-6 flex gap-2">
          <button onClick={() => setTab("employees")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "employees" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"}`}>Employees</button>
          <button onClick={() => setTab("runs")} className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "runs" ? "bg-cyan-600 text-white" : "bg-slate-800 text-slate-400"}`}>Payroll Runs</button>
        </div>

        {tab === "employees" && (
          <div>
            <button onClick={() => setShowForm(!showForm)} className="mb-4 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">+ Add Employee</button>
            {showForm && (
              <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-2 gap-3 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <input placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Designation" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Salary" type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Bank Name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="Account Number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <input placeholder="IFSC" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm" />
                <div className="col-span-2 flex gap-2">
                  <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">Save</button>
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-lg bg-slate-700 px-4 py-2 text-sm text-slate-300">Cancel</button>
                </div>
              </form>
            )}
            <div className="space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3">
                  <div>
                    <p className="font-medium text-white">{emp.name} <span className="text-xs text-slate-500">({emp.code})</span></p>
                    <p className="text-xs text-slate-400">{emp.department}{emp.designation ? ` — ${emp.designation}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-cyan-300">₹{emp.salary.toLocaleString()}</p>
                    <span className={`text-xs ${emp.isActive ? "text-emerald-400" : "text-red-400"}`}>{emp.isActive ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              ))}
              {employees.length === 0 && <p className="text-sm text-slate-500">No employees yet.</p>}
            </div>
          </div>
        )}

        {tab === "runs" && (
          <div>
            <Link href="/payroll/run" className="mb-4 inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500">Run Payroll</Link>
            <div className="space-y-2">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 p-3 text-sm">
                  <div>
                    <p className="font-medium text-white">{r.employee.name}</p>
                    <p className="text-xs text-slate-400">{r.month}/{r.year}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-cyan-300">₹{r.netPay.toLocaleString()}</p>
                    <span className={`text-xs ${r.status === "paid" ? "text-emerald-400" : "text-amber-400"}`}>{r.status}</span>
                  </div>
                </div>
              ))}
              {runs.length === 0 && <p className="text-sm text-slate-500">No payroll runs yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
