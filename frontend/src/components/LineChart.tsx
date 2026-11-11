import { formatDay, formatNumber } from '../format'

type Props = {
  title: string
  points: { day: string; value: number }[]
  unit: string
  emptyMessage: string
  referenceLine?: { value: number; label: string }
}

const width = 320
const height = 160
const right = 12
const top = 12
const bottom = 136

// A small SVG line chart: points by date, oldest on the left. Used for body weight and 1RM.
export default function LineChart({ title, points, unit, emptyMessage, referenceLine }: Props) {
  if (points.length === 0) {
    return (
      <p className="border-border text-muted rounded-xl border border-dashed p-6 text-center">
        {emptyMessage}
      </p>
    )
  }
  const times = points.map((point) => Date.parse(`${point.day}T12:00:00`))
  const values = points.map((point) => point.value)
  const left = 40
  const firstTime = Math.min(...times)
  const timeSpan = Math.max(...times) - firstTime
  // Pad the value range so a flat line or a single point sits in the middle, not on an edge.
  const rangeValues = referenceLine ? [...values, referenceLine.value] : values
  const padding = Math.max((Math.max(...values) - Math.min(...values)) * 0.15, 1)
  const low = Math.min(...rangeValues) - padding
  const high = Math.max(...rangeValues) + padding
  // One labelled line at the highest and one at the lowest value (just one if they are equal).
  const gridValues = [...new Set([Math.max(...values), Math.min(...values)])]

  const x = (time: number) =>
    timeSpan === 0
      ? (left + width - right) / 2
      : left + ((time - firstTime) / timeSpan) * (width - left - right)
  const y = (value: number) => bottom - ((value - low) / (high - low)) * (bottom - top)
  const coordinates = points.map((point, index) => [x(times[index]), y(point.value)])
  const referenceLabelX = width - right - 4

  return (
    <figure>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        role="img"
        aria-label={`${title}, ${unit}${referenceLine ? `, ${referenceLine.label} ${formatNumber(referenceLine.value)} ${unit}` : ''}`}
      >
        {gridValues.map((value, index) => (
          <g key={index}>
            <line
              x1={left}
              x2={width - right}
              y1={y(value)}
              y2={y(value)}
              className="stroke-border"
            />
            <text x={left - 6} y={y(value) + 4} textAnchor="end" className="fill-muted text-[10px]">
              {formatNumber(value)}
            </text>
          </g>
        ))}
        {referenceLine && (
          <g>
            <line
              x1={left}
              x2={width - right}
              y1={y(referenceLine.value)}
              y2={y(referenceLine.value)}
              strokeDasharray="4 4"
              className="stroke-muted"
            />
          </g>
        )}
        <polyline
          points={coordinates.map((point) => point.join(',')).join(' ')}
          fill="none"
          strokeWidth={2.5}
          strokeLinejoin="round"
          className="stroke-lime"
        />
        {coordinates.map(([cx, cy], index) => (
          <circle key={points[index].day} cx={cx} cy={cy} r={4} className="fill-lime">
            <title>{`${formatDay(points[index].day)}: ${formatNumber(points[index].value)} ${unit}`}</title>
          </circle>
        ))}
        {referenceLine && (
          <g>
            <rect
              x={referenceLabelX - 66}
              y={y(referenceLine.value) - 13}
              width={66}
              height={12}
              rx={3}
              className="fill-panel"
            />
            <text
              x={referenceLabelX}
              y={y(referenceLine.value) - 4}
              textAnchor="end"
              className="fill-muted text-[9px] font-semibold"
            >
              {referenceLine.label} {formatNumber(referenceLine.value)} {unit}
            </text>
          </g>
        )}
        <text x={left} y={height - 6} className="fill-muted text-[10px]">
          {formatDay(points[0].day)}
        </text>
        {points.length > 1 && (
          <text
            x={width - right}
            y={height - 6}
            textAnchor="end"
            className="fill-muted text-[10px]"
          >
            {formatDay(points[points.length - 1].day)}
          </text>
        )}
      </svg>
      <figcaption className="text-muted mt-1 text-sm">
        {title} · {unit}
      </figcaption>
    </figure>
  )
}
