"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-red-400 mb-3">Application Error</h2>
          <p className="text-sm text-slate-400 mb-6">{error.message || "An unexpected error occurred."}</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
