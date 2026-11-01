'use client'
// Option cards with a radio ring, frames 2.5 and 2.7.
import st from '../steps.module.css'

export const ICONS = {
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M15 9.5c-.6-.9-1.6-1.5-3-1.5-1.7 0-2.8.9-2.8 2 0 2.8 5.8 1.5 5.8 4.4 0 1.2-1.2 2.1-2.9 2.1-1.4 0-2.5-.6-3.1-1.5',
}

export interface Option<V extends string> {
  value: V
  label: string
  sub: string
  icon: string
}

export function Options<V extends string>({
  name,
  legend,
  options,
  value,
  onChange,
}: {
  name: string
  legend: string
  options: Option<V>[]
  value: V
  onChange(value: V): void
}) {
  return (
    <fieldset className={st.opts}>
      <legend className={st.hidden}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={st.opt}>
          <input className={st.hidden} type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className={st.optIcon}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1C1255" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={o.icon} />
            </svg>
          </span>
          <span className={st.optText}>
            <span className={st.optLabel}>{o.label}</span>
            <span className={st.optSub}>{o.sub}</span>
          </span>
          <span className={st.radio} aria-hidden="true" />
        </label>
      ))}
    </fieldset>
  )
}
