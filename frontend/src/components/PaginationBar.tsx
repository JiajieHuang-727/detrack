import Button from 'react-bootstrap/Button'

type PaginationBarProps = {
  page: number
  totalPages: number
  total: number
  disabled?: boolean
  onPageChange: (page: number) => void
}

export function PaginationBar({
  page,
  totalPages,
  total,
  disabled = false,
  onPageChange,
}: PaginationBarProps) {
  if (total === 0) return null

  return (
    <div className="pagination-bar">
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={disabled || page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </Button>
      <span className="pagination-status">
        Page {page} of {Math.max(totalPages, 1)}
      </span>
      <Button
        size="sm"
        variant="outline-secondary"
        disabled={disabled || page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </Button>
    </div>
  )
}
