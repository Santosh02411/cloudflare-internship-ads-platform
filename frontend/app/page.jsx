/**
 * Home Page
 */

'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    }
  }, [isAuthenticated, loading, router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin mb-4">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full"></div>
        </div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
