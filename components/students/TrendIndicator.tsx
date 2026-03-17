interface TrendIndicatorProps {
  delta: number | null | undefined;
  metricType?: "behaviour" | "attendance";
  label?: string;
}

export function TrendIndicator({ delta, metricType = "behaviour", label }: TrendIndicatorProps) {
  if (delta === null || delta === undefined) {
    return <span className="text-muted" title="No previous data">&ndash;</span>;
  }

  let icon: string;
  let colorClass: string;

  if (delta === 0) {
    icon = "\u2013";
    colorClass = "text-muted";
  } else if (delta > 0) {
    icon = "\u2191";
    colorClass = metricType === "attendance" ? "text-success" : "text-error";
  } else {
    icon = "\u2193";
    colorClass = metricType === "attendance" ? "text-error" : "text-success";
  }

  const tooltipText = label
    ? `${label}: ${delta > 0 ? "+" : ""}${delta.toFixed(1)}`
    : `${delta > 0 ? "+" : ""}${delta.toFixed(1)}`;

  return (
    <span className={`font-medium ${colorClass}`} title={tooltipText} aria-label={tooltipText}>
      {icon}
    </span>
  );
}
