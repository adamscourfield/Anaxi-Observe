"use client";

import { TileOption } from "@/components/ui/tile-option";

export function SignalTileGroup({
  options,
  selected,
  onSelect,
}: {
  options: { key: string; label: string }[];
  selected: string | null;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      {options.map((option) => (
        <TileOption
          key={option.key}
          type="button"
          onClick={() => onSelect(option.key)}
          selected={selected === option.key}
          className="text-base"
        >
          {option.label}
        </TileOption>
      ))}
    </div>
  );
}
