'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function EditRecipeRedirect() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string

  useEffect(() => {
    // For now, the "edit" page is not implemented after the rollback.
    // We will redirect the user back to the recipe view page.
    // A proper edit page can be built in the future.
    if (recipeId) {
      router.replace(`/recipes/${recipeId}`)
    } else {
      router.replace('/recipes')
    }
  }, [router, recipeId])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  )
} 