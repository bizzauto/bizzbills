"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <span className="text-6xl">⚠️</span>
      <h1 className="mt-6 text-5xl font-bold text-white">500</h1>
      <p className="mt-4 text-lg text-slate-400">Something went wrong</p>
      <p className="mt-2 text-sm text-slate-500">{error.message || "An unexpected error occurred."}</p>
      <button
        onClick={reset}
        className="mt-8 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
      >
        Try again
      </button>
    </div>
  );
}
