import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <span className="text-6xl">🔍</span>
      <h1 className="mt-6 text-6xl font-bold text-default">404</h1>
      <p className="mt-4 text-lg text-muted">Page not found</p>
      <p className="mt-2 text-sm text-muted">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
      <Link href="/" className="mt-8 rounded-full bg-cyan-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
        Go home
      </Link>
    </div>
  );
}
