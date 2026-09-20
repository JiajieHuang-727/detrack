import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_WIDTH = 72

function readStored(storageKey: string, defaults: number[]) {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as unknown
    if (
      Array.isArray(parsed) &&
      parsed.length === defaults.length &&
      parsed.every((value) => typeof value === 'number' && Number.isFinite(value))
    ) {
      return parsed.map((value) => Math.max(MIN_WIDTH, Math.round(value)))
    }
  } catch {
    // Ignore unreadable storage and fall back to defaults.
  }
  return defaults
}

export function useColumnWidths(storageKey: string, defaults: number[]) {
  const [widths, setWidths] = useState(() => readStored(storageKey, defaults))
  const widthsRef = useRef(widths)

  useEffect(() => {
    widthsRef.current = widths
  }, [widths])

  const setWidth = useCallback((index: number, width: number) => {
    setWidths((current) =>
      current.map((value, i) => (i === index ? Math.max(MIN_WIDTH, Math.round(width)) : value)),
    )
  }, [])

  const commit = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(widthsRef.current))
    } catch {
      // Ignore quota / private-mode failures.
    }
  }, [storageKey])

  return { widths, setWidth, commit }
}
