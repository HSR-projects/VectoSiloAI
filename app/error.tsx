"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#212121] text-white p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl mb-4">⚠</div>
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-gray-400 text-sm">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={reset}
          className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
