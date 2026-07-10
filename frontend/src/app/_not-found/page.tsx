"use client";

import Link from "next/link";

export default function NotFoundPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-center p-4">
      <h1 className="font-display uppercase tracking-tight font-bold text-5xl text-gray-900 dark:text-white mb-4">404</h1>
      <p className="mb-6 text-lg text-gray-600 dark:text-gray-400">Oops! Page not found.</p>
      <Link
        href="/"
        className="px-6 py-3 rounded-xl bg-red-600 text-white font-display uppercase tracking-wide font-semibold hover:bg-red-700 transition-colors"
      >
        Go Home
      </Link>
    </div>
  );
}
