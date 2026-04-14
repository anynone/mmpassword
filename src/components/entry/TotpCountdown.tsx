interface TotpCountdownProps {
  remaining: number // 0-30
}

export function TotpCountdown({ remaining }: TotpCountdownProps) {
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const progress = remaining / 30
  const dashOffset = circumference * (1 - progress)

  const color =
    remaining > 10
      ? "hsl(var(--primary))"
      : remaining > 5
        ? "hsl(45, 93%, 47%)"
        : "hsl(0, 84%, 60%)"

  return (
    <div className="relative w-9 h-9 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {/* Background circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="3"
          opacity="0.3"
        />
        {/* Progress circle */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      {/* Center text */}
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
        {remaining}
      </span>
    </div>
  )
}
