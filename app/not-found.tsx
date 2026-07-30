import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#212121] text-white p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-gray-400 text-sm">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
