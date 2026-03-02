"use client";

export default function KdsStationError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 p-4">
      <div className="rounded-lg border border-red-800 bg-red-950 p-6 text-center max-w-sm">
        <p className="text-sm font-medium text-red-400 mb-1">KDS gap loi</p>
        <p className="text-xs text-gray-400 mb-4">{error.message}</p>
        <button
          onClick={reset}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
        >
          Thu lai
        </button>
      </div>
    </div>
  );
}
