'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Navigation() {
  const router = useRouter();

  const handleLogout = async () => {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
      router.push('/login');
    } else {
      alert('Logout failed.');
    }
  };

  return (
    <header className="bg-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <Link href="/" className="text-lg font-bold text-gray-800">
              Recipe Database
            </Link>
          </div>
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
} 