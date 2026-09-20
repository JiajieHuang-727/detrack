import { useRef, type PointerEvent, type ReactNode } from 'react'

export type SortDirection = 'asc' | 'desc'

type ResizableThProps = {
  children?: ReactNode
  width: number
  onResize: (width: number) => void
  onResizeEnd?: () => void
  sortDirection?: SortDirection | null
  onSort?: () => void
}

export function ResizableTh({
  children,
  width,
  onResize,
  onResizeEnd,
  sortDirection = null,
  onSort,
}: ResizableThProps) {
  const startX = useRef(0)
  const startWidth = useRef(width)

  function onPointerDown(event: PointerEvent<HTMLSpanElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    startX.current = event.clientX
    startWidth.current = width
    document.body.classList.add('resizing-columns')
  }

  function onPointerMove(event: PointerEvent<HTMLSpanElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    onResize(startWidth.current + (event.clientX - startX.current))
  }

  function onPointerUp(event: PointerEvent<HTMLSpanElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    document.body.classList.remove('resizing-columns')
    onResizeEnd?.()
  }

  const sortable = Boolean(onSort)
  const ariaSort =
    sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : 'none'

  return (
    <th
      className="resizable-th"
      style={{ width, minWidth: width }}
      aria-sort={sortable ? ariaSort : undefined}
    >
      {sortable ? (
        <button
          type="button"
          className="sort-th-button"
          aria-label={
            typeof children === 'string'
              ? sortDirection === 'asc'
                ? `Sort ${children} descending`
                : `Sort ${children} ascending`
              : undefined
          }
          onClick={onSort}
        >
          <span className="resizable-th-label">{children}</span>
          <span className="sort-indicator" aria-hidden="true">
            {sortDirection === 'asc' ? '↑' : sortDirection === 'desc' ? '↓' : '↕'}
          </span>
        </button>
      ) : (
        <span className="resizable-th-label">{children}</span>
      )}
      <span
        className="resize-handle"
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </th>
  )
}

type ColGroupProps = {
  widths: number[]
}

export function ColumnGroup({ widths }: ColGroupProps) {
  return (
    <colgroup>
      {widths.map((width, index) => (
        <col key={index} style={{ width, minWidth: width }} />
      ))}
    </colgroup>
  )
}
