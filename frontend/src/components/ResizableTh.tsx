import { useRef, type PointerEvent, type ReactNode } from 'react'

type ResizableThProps = {
  children?: ReactNode
  width: number
  onResize: (width: number) => void
  onResizeEnd?: () => void
}

export function ResizableTh({ children, width, onResize, onResizeEnd }: ResizableThProps) {
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

  return (
    <th className="resizable-th" style={{ width, minWidth: width }}>
      <span className="resizable-th-label">{children}</span>
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
