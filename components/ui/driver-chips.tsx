type Driver = { label: string };

export function DriverChips({
  drivers,
  max = 2,
}: {
  drivers: Driver[];
  max?: number;
}) {
  if (drivers.length === 0) return null;
  const visible = drivers.slice(0, max);
  const overflow = drivers.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((d, i) => (
        <span
          key={i}
          className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted"
        >
          {d.label}
        </span>
      ))}
      {overflow > 0 && (
        <span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] text-muted">
          +{overflow}
        </span>
      )}
    </div>
  );
}
