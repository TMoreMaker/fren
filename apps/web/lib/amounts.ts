// The two amount presets on frame 2.7. Shared by the page and the server.
export const AMOUNT_PRESETS = {
  small: { amounts: [3, 5, 10], defaultAmount: 5 },
  pro: { amounts: [5, 10, 20], defaultAmount: 10 },
} as const
export type AmountPreset = keyof typeof AMOUNT_PRESETS

export function presetOf(amounts: number[] | null): AmountPreset | null {
  if (!amounts) return null
  const match = Object.entries(AMOUNT_PRESETS).find(([, p]) => p.amounts.join() === amounts.join())
  return (match?.[0] as AmountPreset) ?? null
}
