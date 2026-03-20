import { NextResponse } from 'next/server'
import { getDatabase } from '@/lib/database'
import { checkMenuCompliance } from '@/lib/compliance/engine'

type SlotIds = {
  lunchOption1: number | null
  lunchOption2: number | null
  lunchOption3: number | null
  servedWith123: number | null
  dessertOptionD: number | null
}

type WeekMenuIds = {
  monday: SlotIds
  tuesday: SlotIds
  wednesday: SlotIds
  thursday: SlotIds
  friday: SlotIds
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const week: WeekMenuIds = body.week
    const settings = body.settings as {
      schoolPhase: 'primary' | 'secondary'
      vegetarianMode: boolean
      cycleMode: 'single' | 'threeWeek'
    }
    const threeWeek = body.threeWeek as { week1: WeekMenuIds; week2: WeekMenuIds; week3: WeekMenuIds } | undefined

    if (!week) {
      return NextResponse.json({ error: 'Missing week payload' }, { status: 400 })
    }

    const collectIdsFromWeek = (w: WeekMenuIds): number[] => {
      const ids: number[] = []
      const days: Array<keyof WeekMenuIds> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      for (const day of days) {
        const slot = w[day]
        ids.push(
          slot.lunchOption1 ?? -1,
          slot.lunchOption2 ?? -1,
          slot.lunchOption3 ?? -1,
          slot.servedWith123 ?? -1,
          slot.dessertOptionD ?? -1
        )
      }
      return Array.from(new Set(ids.filter((id) => id > 0)))
    }

    const weekIds = collectIdsFromWeek(week)
    const cycleIds = settings.cycleMode === 'threeWeek' && threeWeek
      ? Array.from(
          new Set([
            ...weekIds,
            ...collectIdsFromWeek(threeWeek.week1),
            ...collectIdsFromWeek(threeWeek.week2),
            ...collectIdsFromWeek(threeWeek.week3),
          ])
        )
      : weekIds

    const db = getDatabase()
    const records = await db.getRecipesComplianceTagsByIds(cycleIds)
    const byId = new Map<number, { id: number; code: string | null; complianceTags: any | null }>(
      records.map((r) => [r.id, r])
    )

    const resolveRecipe = (id: number | null) => {
      if (!id) return null
      const r = byId.get(id)
      if (!r) {
        // Unknown recipe id: return null so rules mark missing/unknown appropriately.
        return null
      }
      return {
        id: r.id,
        code: r.code,
        complianceTags: r.complianceTags,
      }
    }

    const resolveWeek = (w: WeekMenuIds) => {
      const mkDay = (day: keyof WeekMenuIds) => ({
        lunchOption1: resolveRecipe(w[day].lunchOption1),
        lunchOption2: resolveRecipe(w[day].lunchOption2),
        lunchOption3: resolveRecipe(w[day].lunchOption3),
        servedWith123: resolveRecipe(w[day].servedWith123),
        dessertOptionD: resolveRecipe(w[day].dessertOptionD),
      })

      return {
        monday: mkDay('monday'),
        tuesday: mkDay('tuesday'),
        wednesday: mkDay('wednesday'),
        thursday: mkDay('thursday'),
        friday: mkDay('friday'),
      }
    }

    const resolvedWeek = resolveWeek(week)

    const cycleWeeks =
      settings.cycleMode === 'threeWeek' && threeWeek
        ? [resolveWeek(threeWeek.week1), resolveWeek(threeWeek.week2), resolveWeek(threeWeek.week3)]
        : undefined

    const result = checkMenuCompliance(resolvedWeek, settings, { cycleWeeks })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Menu compliance check failed:', error)
    return NextResponse.json(
      { error: 'Menu compliance check failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

