import React from 'react'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Navigation from './components/Navigation'
import './globals.css'

export const metadata: Metadata = {
  title: 'Recipe Database',
  description: 'A recipe database system for managing ingredients and allergies',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if the user is authenticated
  const cookieStore = await cookies()
  const authToken = cookieStore.get('authToken')

  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {authToken && <Navigation />}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  )
} 