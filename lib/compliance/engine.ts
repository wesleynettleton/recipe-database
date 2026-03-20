import assert from 'node:assert'
import type { RecipeComplianceTags } from '@/lib/types'

export type ComplianceStatus = 'pass' | 'fail' | 'manual'

export type RuleStatus = 'pass' | 'fail' | 'manual'

export interface RuleResult {
  ruleId: string
  title: string
  status: RuleStatus
  message: string
  evidence?: Record<string, any>
}

export interface ComplianceIssue {
  severity: 'fail' | 'warning' | 'manual'
  message: string
  day?: string
  recipeId?: number
}

export interface ComplianceCheckResult {
  status: ComplianceStatus
  ruleResults: RuleResult[]
  issues: ComplianceIssue[]
  counts: Record<string, any>
}

export type DayKey = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday'

export interface ResolvedRecipe {
  id: number
  code?: string | null
  complianceTags?: RecipeComplianceTags | null
}

export interface DayMenuSelection {
  lunchOption1: ResolvedRecipe | null
  lunchOption2: ResolvedRecipe | null
  lunchOption3: ResolvedRecipe | null
  servedWith123: ResolvedRecipe | null
  dessertOptionD: ResolvedRecipe | null
}

export interface WeekMenuSelection {
  monday: DayMenuSelection
  tuesday: DayMenuSelection
  wednesday: DayMenuSelection
  thursday: DayMenuSelection
  friday: DayMenuSelection
}

export interface ComplianceCheckSettings {
  schoolPhase: 'primary' | 'secondary'
  vegetarianMode: boolean
  // If provided, oily fish is checked across 3 weeks as required by the checklist.
  cycleMode: 'single' | 'threeWeek'
}

function normalizeVarietyList(values?: string[] | null): string[] {
  if (!values || !Array.isArray(values)) return []
  return values
    .map((v) => (typeof v === 'string' ? v.trim().toLowerCase() : ''))
    .filter(Boolean)
}

function anyOf(recipes: Array<ResolvedRecipe | null>, predicate: (r: ResolvedRecipe) => boolean): boolean {
  return recipes.some((r) => !!r && predicate(r))
}

function countOf(recipes: Array<ResolvedRecipe | null>, predicate: (r: ResolvedRecipe) => boolean): number {
  return recipes.reduce((acc, r) => acc + (!!r && predicate(r) ? 1 : 0), 0)
}

function dayHas(recipes: Array<ResolvedRecipe | null>, predicate: (r: ResolvedRecipe) => boolean): boolean {
  return anyOf(recipes, predicate)
}

function collectVarieties(
  recipes: Array<ResolvedRecipe | null>,
  selector: (tags: RecipeComplianceTags) => string[] | undefined
): string[] {
  const out: string[] = []
  for (const r of recipes) {
    if (!r?.complianceTags) continue
    const tags = r.complianceTags
    out.push(...(selector(tags) || []))
  }
  return normalizeVarietyList(out)
}

export function checkMenuCompliance(
  week: WeekMenuSelection,
  settings: ComplianceCheckSettings,
  context?: { cycleWeeks?: WeekMenuSelection[] }
): ComplianceCheckResult {
  const dayKeys: DayKey[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']

  const ruleResults: RuleResult[] = []
  const issues: ComplianceIssue[] = []
  const counts: Record<string, any> = {}

  const getDayLunch = (day: DayKey): Array<ResolvedRecipe | null> => {
    const d = week[day]
    return [d.lunchOption1, d.lunchOption2, d.lunchOption3, d.servedWith123]
  }

  const getDayAllLunchAndDessert = (day: DayKey): Array<ResolvedRecipe | null> => {
    const d = week[day]
    return [d.lunchOption1, d.lunchOption2, d.lunchOption3, d.servedWith123, d.dessertOptionD]
  }

  // --- Starchy food ---
  const starchyDaysMissing: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const ok = dayHas(lunch, (r) => !!r.complianceTags?.isStarchyFood || !!r.complianceTags?.isBreadNoAddedFatOil)
    if (!ok) starchyDaysMissing.push(day)
  }
  const starchyEveryDayPass = starchyDaysMissing.length === 0
  if (!starchyEveryDayPass) {
    issues.push({
      severity: 'fail',
      message: `Starchy food is missing on: ${starchyDaysMissing.join(', ')}`,
    })
  }
  ruleResults.push({
    ruleId: 'starchy_every_day',
    title: 'Starchy food every day',
    status: starchyEveryDayPass ? 'pass' : 'fail',
    message: starchyEveryDayPass
      ? 'At least one starchy option is present each day.'
      : 'Some days do not include a starchy food.',
    evidence: { missingDays: starchyDaysMissing },
  })

  // Bread with no added fat or oil every day
  const breadDaysMissing: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const ok = dayHas(lunch, (r) => !!r.complianceTags?.isBreadNoAddedFatOil)
    if (!ok) breadDaysMissing.push(day)
  }
  const breadEveryDayPass = breadDaysMissing.length === 0
  if (!breadEveryDayPass) {
    issues.push({
      severity: 'fail',
      message: `Bread (no added fat/oil) missing on: ${breadDaysMissing.join(', ')}`,
    })
  }
  ruleResults.push({
    ruleId: 'bread_no_added_fat_oil_every_day',
    title: 'Bread (no added fat/oil) every day',
    status: breadEveryDayPass ? 'pass' : 'fail',
    message: breadEveryDayPass
      ? 'Bread (no added fat/oil) is available every day.'
      : 'Bread (no added fat/oil) is missing for one or more days.',
    evidence: { missingDays: breadDaysMissing },
  })

  // Starchy variety diversity (3+ different starchy foods each week)
  const allLunch = dayKeys.flatMap((d) => getDayLunch(d))
  const starchyVarieties = collectVarieties(allLunch, (tags) => tags.starchyVarieties)
  const starchyVarietyPass = starchyVarieties.length >= 3
  if (!starchyVarietyPass) {
    issues.push({
      severity: 'fail',
      message: `Not enough different starchy foods: ${starchyVarieties.length} found, need 3+.`,
    })
  }
  ruleResults.push({
    ruleId: 'starchy_3_different_week',
    title: '3+ different starchy foods each week',
    status: starchyVarietyPass ? 'pass' : 'fail',
    message: starchyVarietyPass
      ? `Found ${starchyVarieties.length} starchy varieties.`
      : `Only ${starchyVarieties.length} starchy varieties found.`,
    evidence: { starchyVarietiesCount: starchyVarieties.length, starchyVarieties },
  })

  // Wholegrain at least one variety each week
  const wholegrainPass = anyOf(allLunch, (r) => !!r.complianceTags?.isWholegrainStarchy)
  if (!wholegrainPass) {
    issues.push({ severity: 'fail', message: 'No wholegrain starchy food found this week.' })
  }
  ruleResults.push({
    ruleId: 'wholegrain_starchy_each_week',
    title: '1+ wholegrain starchy food each week',
    status: wholegrainPass ? 'pass' : 'fail',
    message: wholegrainPass ? 'Wholegrain starchy food present this week.' : 'Wholegrain starchy food missing.',
    evidence: { present: wholegrainPass },
  })

  // Starchy cooked in fat/oil no more than 2 days each week
  const starchyOilDays: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const ok = dayHas(lunch, (r) => !!r.complianceTags?.isStarchyCookedInFatOil)
    if (ok) starchyOilDays.push(day)
  }
  const starchyOilPass = starchyOilDays.length <= 2
  if (!starchyOilPass) {
    issues.push({
      severity: 'fail',
      message: `Starchy cooked in fat/oil appears on ${starchyOilDays.length} days (max 2).`,
    })
  }
  ruleResults.push({
    ruleId: 'starchy_oil_limit_2_days',
    title: 'Starchy cooked in fat/oil <= 2 days/week',
    status: starchyOilPass ? 'pass' : 'fail',
    message: starchyOilPass
      ? `Within limit: ${starchyOilDays.length} day(s).`
      : `Over limit: ${starchyOilDays.length} day(s).`,
    evidence: { oilDays: starchyOilDays, oilDaysCount: starchyOilDays.length },
  })

  // --- Fruit and vegetables ---
  const vegDaysMissing: DayKey[] = []
  const fruitDaysMissing: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const hasVeg = dayHas(lunch, (r) => !!r.complianceTags?.hasVegetableOrSaladAccompaniment)
    const hasFruit = dayHas(lunch, (r) => !!r.complianceTags?.hasFruitPortion)
    if (!hasVeg) vegDaysMissing.push(day)
    if (!hasFruit) fruitDaysMissing.push(day)
  }
  const vegDailyPass = vegDaysMissing.length === 0
  const fruitDailyPass = fruitDaysMissing.length === 0
  if (!vegDailyPass) issues.push({ severity: 'fail', message: `Vegetable/salad accompaniment missing on: ${vegDaysMissing.join(', ')}` })
  if (!fruitDailyPass) issues.push({ severity: 'fail', message: `Fruit portion missing on: ${fruitDaysMissing.join(', ')}` })
  ruleResults.push({
    ruleId: 'veg_accompaniment_every_day',
    title: 'Vegetables/salad accompaniment every day',
    status: vegDailyPass ? 'pass' : 'fail',
    message: vegDailyPass ? 'Vegetable/salad accompaniment present each day.' : 'Some days are missing vegetables/salad.',
    evidence: { missingDays: vegDaysMissing },
  })
  ruleResults.push({
    ruleId: 'fruit_every_day',
    title: 'Fruit every day',
    status: fruitDailyPass ? 'pass' : 'fail',
    message: fruitDailyPass ? 'Fruit portion present each day.' : 'Some days are missing fruit.',
    evidence: { missingDays: fruitDaysMissing },
  })

  // Dessert containing at least 50% fruit 2+ times each week
  const dessertCount50Plus = dayKeys.reduce((acc, day) => {
    const d = week[day]
    if (!d.dessertOptionD?.complianceTags) return acc
    return acc + (d.dessertOptionD.complianceTags.isFruitDessert50Plus ? 1 : 0)
  }, 0)
  const fruitDessertPass = dessertCount50Plus >= 2
  if (!fruitDessertPass) issues.push({ severity: 'fail', message: `Fruit dessert (>=50%) only appears ${dessertCount50Plus} time(s) this week.` })
  ruleResults.push({
    ruleId: 'fruit_dessert_2plus_week',
    title: 'Fruit dessert >=50% 2+ times each week',
    status: fruitDessertPass ? 'pass' : 'fail',
    message: fruitDessertPass ? 'Meets the fruit dessert frequency requirement.' : 'Does not meet the fruit dessert frequency requirement.',
    evidence: { dessertCount50Plus },
  })

  const allFruitForVariety = allLunch.concat(
    dayKeys.map((d) => week[d].dessertOptionD).filter(Boolean)
  )
  const fruitVarieties = collectVarieties(allFruitForVariety, (tags) => tags.fruitVarieties)
  const fruitDiversityPass = fruitVarieties.length >= 3
  if (!fruitDiversityPass) issues.push({ severity: 'fail', message: `Not enough different fruits: ${fruitVarieties.length} found, need 3+.` })
  ruleResults.push({
    ruleId: 'fruit_3_different_week',
    title: '3+ different fruits each week',
    status: fruitDiversityPass ? 'pass' : 'fail',
    message: fruitDiversityPass ? 'Fruit diversity requirement met.' : 'Fruit diversity requirement not met.',
    evidence: { fruitVarietiesCount: fruitVarieties.length, fruitVarieties },
  })

  const vegetableVarieties = collectVarieties(allLunch, (tags) => tags.vegetableVarieties)
  const vegDiversityPass = vegetableVarieties.length >= 3
  if (!vegDiversityPass) issues.push({ severity: 'fail', message: `Not enough different vegetables: ${vegetableVarieties.length} found, need 3+.` })
  ruleResults.push({
    ruleId: 'vegetables_3_different_week',
    title: '3+ different vegetables each week',
    status: vegDiversityPass ? 'pass' : 'fail',
    message: vegDiversityPass ? 'Vegetable diversity requirement met.' : 'Vegetable diversity requirement not met.',
    evidence: { vegetableVarietiesCount: vegetableVarieties.length, vegetableVarieties },
  })

  // --- Protein ---
  const proteinDaysMissing: DayKey[] = []
  const meatDays: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const hasProtein = dayHas(lunch, (r) => !!r.complianceTags?.hasProtein)
    if (!hasProtein) proteinDaysMissing.push(day)
    const hasMeat = dayHas(lunch, (r) => !!r.complianceTags?.isMeatOrPoultry)
    if (hasMeat) meatDays.push(day)
  }
  const proteinDailyPass = proteinDaysMissing.length === 0
  const meatDaysPass = meatDays.length >= 3
  if (!proteinDailyPass) issues.push({ severity: 'fail', message: `Protein portion missing on: ${proteinDaysMissing.join(', ')}` })
  if (!meatDaysPass) issues.push({ severity: 'fail', message: `Meat/poultry appears on ${meatDays.length} day(s) (need 3+).` })
  ruleResults.push({
    ruleId: 'protein_every_day',
    title: 'Protein portion every day',
    status: proteinDailyPass ? 'pass' : 'fail',
    message: proteinDailyPass ? 'Protein portion present each day.' : 'Some days are missing protein.',
    evidence: { missingDays: proteinDaysMissing },
  })
  ruleResults.push({
    ruleId: 'meat_poultry_3plus_days',
    title: 'Meat/poultry on 3+ days each week',
    status: meatDaysPass ? 'pass' : 'fail',
    message: meatDaysPass ? 'Meat/poultry frequency met.' : 'Meat/poultry frequency not met.',
    evidence: { meatDays, meatDaysCount: meatDays.length },
  })

  // Vegetarian non-dairy protein (only enforced when vegetarianMode is enabled)
  if (settings.vegetarianMode) {
    const vegProteinDays = dayKeys.filter((day) =>
      dayHas(getDayLunch(day), (r) => !!r.complianceTags?.isVegetarianNonDairyProtein)
    )
    const vegProteinPass = vegProteinDays.length >= 3
    if (!vegProteinPass) issues.push({ severity: 'fail', message: `Non-dairy vegetarian protein appears on ${vegProteinDays.length} day(s) (need 3+).` })
    ruleResults.push({
      ruleId: 'vegetarian_non_dairy_protein_3plus',
      title: 'Non-dairy vegetarian protein on 3+ days/week',
      status: vegProteinPass ? 'pass' : 'fail',
      message: vegProteinPass ? 'Vegetarian protein frequency met.' : 'Vegetarian protein frequency not met.',
      evidence: { vegProteinDays, vegProteinDaysCount: vegProteinDays.length },
    })
  } else {
    ruleResults.push({
      ruleId: 'vegetarian_non_dairy_protein_3plus',
      title: 'Non-dairy vegetarian protein on 3+ days/week',
      status: 'manual',
      message: 'Vegetarian rule not enforced (vegetarianMode disabled).',
    })
  }

  // Meat/poultry products (primary: once/week, secondary: twice/week)
  const meatProductPortions = countOf(allLunch, (r) => !!r.complianceTags?.isMeatOrPoultryProduct)
  const meatProductLimit = settings.schoolPhase === 'primary' ? 1 : 2
  const meatProductPass = meatProductPortions <= meatProductLimit
  if (!meatProductPass) issues.push({ severity: 'fail', message: `Meat/poultry products total: ${meatProductPortions} (limit ${meatProductLimit}/week).` })
  ruleResults.push({
    ruleId: 'meat_poultry_product_limit',
    title: `Meat/poultry products <= ${meatProductLimit} per week`,
    status: meatProductPass ? 'pass' : 'fail',
    message: meatProductPass ? 'Meat/poultry product frequency met.' : 'Meat/poultry product frequency not met.',
    evidence: { meatProductPortions, meatProductLimit, schoolPhase: settings.schoolPhase },
  })

  // Oily fish: strict across 3 weeks (check uses tags). Single-week is manual.
  const flattenAllItemsAcrossDaySlots = (w: WeekMenuSelection) =>
    dayKeys.flatMap((d) => {
      const dayMenu = w[d]
      return [dayMenu.lunchOption1, dayMenu.lunchOption2, dayMenu.lunchOption3, dayMenu.servedWith123, dayMenu.dessertOptionD]
    })

  if (settings.cycleMode === 'threeWeek') {
    const cycleWeeks = context?.cycleWeeks
    if (!cycleWeeks || cycleWeeks.length < 3) {
      ruleResults.push({
        ruleId: 'oily_fish_once_every_3_weeks',
        title: 'Oily fish once or more every 3 weeks',
        status: 'manual',
        message: '3-week strict oily fish check requires 3-week context from the API.',
      })
    } else {
      const allCycleItems = cycleWeeks.flatMap((w) => flattenAllItemsAcrossDaySlots(w))
      const oilyFishCount = countOf(allCycleItems, (r) => !!r.complianceTags?.isOilyFish)
      const oilyFishPass = oilyFishCount >= 1

      if (!oilyFishPass) {
        issues.push({ severity: 'fail', message: `No oily fish detected across the 3-week cycle.` })
      }
      ruleResults.push({
        ruleId: 'oily_fish_once_every_3_weeks',
        title: 'Oily fish once or more every 3 weeks',
        status: oilyFishPass ? 'pass' : 'fail',
        message: oilyFishPass ? 'Oily fish included at least once across the 3-week cycle.' : 'Oily fish not included across the 3-week cycle.',
        evidence: { oilyFishCount },
      })
    }
  } else {
    const hasOilyFishThisWeek = anyOf(allLunch, (r) => !!r.complianceTags?.isOilyFish)
    ruleResults.push({
      ruleId: 'oily_fish_once_every_3_weeks',
      title: 'Oily fish once or more every 3 weeks',
      status: hasOilyFishThisWeek ? 'pass' : 'manual',
      message: hasOilyFishThisWeek
        ? 'Oily fish is included this week (helps meet the 3-week requirement).'
        : 'No oily fish detected this week (strict 3-week evaluation requires 3 weeks).',
      evidence: { hasOilyFishThisWeek },
    })
  }

  // --- High fat/sugar/salt ---
  const allDayItems = dayKeys.flatMap((d) => getDayAllLunchAndDessert(d))
  const deepFriedCount = countOf(allDayItems, (r) => !!r.complianceTags?.isDeepFriedBatteredBreadcrumbed)
  const deepFriedPass = deepFriedCount <= 2
  if (!deepFriedPass) issues.push({ severity: 'fail', message: `Deep-fried/battered/breadcrumbed portions: ${deepFriedCount} (limit 2/week).` })
  ruleResults.push({
    ruleId: 'deep_fried_battered_breadcrumbed_limit_2',
    title: 'Deep-fried/battered/breadcrumbed <= 2 portions/week',
    status: deepFriedPass ? 'pass' : 'fail',
    message: deepFriedPass ? 'Deep-fried/battered/breadcrumbed limit met.' : 'Deep-fried/battered/breadcrumbed limit exceeded.',
    evidence: { deepFriedCount },
  })

  const pastryCount = countOf(allDayItems, (r) => !!r.complianceTags?.hasPastry)
  const pastryPass = pastryCount <= 2
  if (!pastryPass) issues.push({ severity: 'fail', message: `Pastry portions: ${pastryCount} (limit 2/week).` })
  ruleResults.push({
    ruleId: 'pastry_limit_2',
    title: 'Pastry <= 2 portions/week',
    status: pastryPass ? 'pass' : 'fail',
    message: pastryPass ? 'Pastry limit met.' : 'Pastry limit exceeded.',
    evidence: { pastryCount },
  })

  const confectioneryPresent = anyOf(allDayItems, (r) => !!r.complianceTags?.hasConfectionery)
  const confectioneryPass = !confectioneryPresent
  if (!confectioneryPass) issues.push({ severity: 'fail', message: 'Confectionery/chocolate content detected (must not be served).' })
  ruleResults.push({
    ruleId: 'no_confectionery_chocolate',
    title: 'No confectionery/chocolate',
    status: confectioneryPass ? 'pass' : 'fail',
    message: confectioneryPass ? 'No confectionery/chocolate detected in tagged recipes.' : 'Confectionery/chocolate detected in one or more recipes.',
  })

  // --- Milk and dairy (partial) ---
  const dairyDaysMissing: DayKey[] = []
  for (const day of dayKeys) {
    const lunch = getDayLunch(day)
    const hasDairy = dayHas(lunch, (r) => !!r.complianceTags?.isDairyFood)
    if (!hasDairy) dairyDaysMissing.push(day)
  }
  const dairyEveryDayPass = dairyDaysMissing.length === 0
  if (!dairyEveryDayPass) issues.push({ severity: 'fail', message: `Dairy portion missing on: ${dairyDaysMissing.join(', ')}` })
  ruleResults.push({
    ruleId: 'dairy_portion_every_day',
    title: 'Dairy portion every day',
    status: dairyEveryDayPass ? 'pass' : 'fail',
    message: dairyEveryDayPass ? 'Dairy portion provided each day.' : 'Some days are missing dairy portion.',
    evidence: { missingDays: dairyDaysMissing },
  })

  ruleResults.push({
    ruleId: 'lower_fat_milk_available_for_drinking',
    title: 'Lower fat milk available for drinking at least once a day',
    status: 'manual',
    message: 'This requires drink/snack modelling or a manual check (not represented in the current menu slots).',
  })

  ruleResults.push({
    ruleId: 'salt_not_available_to_add_after_cooking',
    title: 'Salt must not be available to add to food after it has been cooked',
    status: 'manual',
    message: 'Manual check required (salt availability is not modelled in the current menu data).',
  })

  ruleResults.push({
    ruleId: 'no_snacks_except_allowed',
    title: 'No snacks (except allowed categories)',
    status: 'manual',
    message: 'Manual check required (snacks are not modelled in the current menu data).',
  })

  ruleResults.push({
    ruleId: 'condiments_limited',
    title: 'Condiments limited to sachets/portions',
    status: 'manual',
    message: 'Manual check required (condiment sizing/availability is not modelled in the current menu data).',
  })

  ruleResults.push({
    ruleId: 'healthy_drinks_water_available',
    title: 'Healthy drinks (water available; allowed drinks only)',
    status: 'manual',
    message: 'Manual check required (drinks are not modelled in the current menu data).',
  })

  // --- Overall status ---
  const hasFail = ruleResults.some((r) => r.status === 'fail')
  const hasManual = ruleResults.some((r) => r.status === 'manual')
  const status: ComplianceStatus = hasFail ? 'fail' : hasManual ? 'manual' : 'pass'

  counts.totalDays = dayKeys.length
  counts.deepFriedCount = deepFriedCount
  counts.pastryCount = pastryCount
  counts.starchyOilDaysCount = starchyOilDays.length
  counts.meatDaysCount = meatDays.length
  counts.meatProductPortions = meatProductPortions
  counts.dairyMissingDaysCount = dairyDaysMissing.length

  return { status, ruleResults, issues, counts }
}

// Minimal “unit test” harness (run manually in dev if needed).
export function runComplianceEngineUnitTests() {
  const stubRecipe = (id: number, tags: RecipeComplianceTags): ResolvedRecipe => ({
    id,
    complianceTags: tags,
  })

  const makeDay = (opts: Partial<DayMenuSelection>): DayMenuSelection => ({
    lunchOption1: opts.lunchOption1 ?? null,
    lunchOption2: opts.lunchOption2 ?? null,
    lunchOption3: opts.lunchOption3 ?? null,
    servedWith123: opts.servedWith123 ?? null,
    dessertOptionD: opts.dessertOptionD ?? null,
  })

  const mkWeek = (dayToRecipe: Partial<Record<DayKey, ResolvedRecipe | null>>): WeekMenuSelection => {
    const makeLunch = (r: ResolvedRecipe | null) =>
      makeDay({
        lunchOption1: r,
        servedWith123: null,
        lunchOption2: null,
        lunchOption3: null,
        dessertOptionD: null,
      })

    return {
      monday: makeLunch(dayToRecipe.monday ?? null),
      tuesday: makeLunch(dayToRecipe.tuesday ?? null),
      wednesday: makeLunch(dayToRecipe.wednesday ?? null),
      thursday: makeLunch(dayToRecipe.thursday ?? null),
      friday: makeLunch(dayToRecipe.friday ?? null),
    }
  }

  const starchy = stubRecipe(1, { isStarchyFood: true, isBreadNoAddedFatOil: true })
  const veg = stubRecipe(2, { hasVegetableOrSaladAccompaniment: true, vegetableVarieties: ['carrot'], hasFruitPortion: true, fruitVarieties: ['apple'], hasProtein: true, isMeatOrPoultry: true, hasPastry: false, isDeepFriedBatteredBreadcrumbed: false, isDairyFood: true })

  const passWeek = mkWeek({ monday: starchy, tuesday: veg, wednesday: veg, thursday: veg, friday: veg })

  const passRes = checkMenuCompliance(passWeek, {
    schoolPhase: 'primary',
    vegetarianMode: false,
    cycleMode: 'single',
  })

  assert.ok(['pass', 'manual'].includes(passRes.status))
}

