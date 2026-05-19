import { useState } from 'react'

interface Props {
  value: number          // 0 = 미설정, 1–5
  onChange?: (v: number) => void
  readOnly?: boolean
  size?: 'sm' | 'md'
}

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: Props) {
  const [hover, setHover] = useState(0)
  const active = hover || value
  const sz = size === 'sm' ? 'text-base' : 'text-2xl'

  return (
    <div className="flex gap-0.5" role="group" aria-label={`별점 ${value}점`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          className={`${sz} leading-none transition-transform select-none ${
            readOnly ? 'cursor-default' : 'cursor-pointer active:scale-125'
          } ${active >= star ? 'text-amber-400' : 'text-gray-200'}`}
          onClick={() => !readOnly && onChange?.(star === value ? 0 : star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
        >
          ★
        </button>
      ))}
    </div>
  )
}
