"use client";

export default function KdsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-gray-900 text-white p-8">
      <div className="rounded-lg border border-red-800 bg-red-950 p-6 text-center max-w-md">
        <h2 className="text-lg font-semibold text-red-400 mb-2">
          KDS gặp lỗi
        </h2>
        <p className="text-sm text-gray-400 mb-4">{error.digest ? "Lỗi hệ thống. Vui lòng thử lại sau." : error.message}</p>
        <button
          onClick={reset}
          className="rounded-md bg-white px-4 py-2 text-sm font-medium text-gray-900 hover:bg-gray-200 transition-colors"
        >
          Thử lại
        </button>
      </div>
    </div>
  );
}
