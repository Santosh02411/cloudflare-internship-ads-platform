'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <h1 className="text-2xl font-bold text-black mb-4">Ads Platform Live</h1>
      <div className="flex gap-4">
        <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded">
          Go to Login
        </Link>
        <Link href="/dashboard" className="px-4 py-2 bg-gray-200 text-black rounded">
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}