"use client";

export function NotObservedToggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2 text-xs text-muted calm-transition hover:text-text">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-accent"
      />
      Not observed
    </label>
  );
}
