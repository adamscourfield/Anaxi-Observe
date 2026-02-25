"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface User {
  id: string;
  fullName: string;
  email: string;
}

interface AttendeeSelectorProps {
  users: User[];
  selected: User[];
  lockedIds?: string[];
  onChange: (selected: User[]) => void;
}

export function AttendeeSelector({ users, selected, lockedIds = [], onChange }: AttendeeSelectorProps) {
  const [search, setSearch] = useState("");

  const filtered = users.filter(
    (u) =>
      (u.fullName.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())) &&
      !selected.some((s) => s.id === u.id)
  );

  function add(user: User) {
    onChange([...selected, user]);
  }

  function remove(userId: string) {
    onChange(selected.filter((u) => u.id !== userId));
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selected.map((u) => (
          <span key={u.id} className="flex items-center gap-1 rounded-full bg-divider px-3 py-1 text-xs text-text">
            {u.fullName}
            {!lockedIds.includes(u.id) && (
              <button type="button" onClick={() => remove(u.id)} className="hover:text-red-600">×</button>
            )}
          </span>
        ))}
      </div>
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search people…"
        className="w-full rounded border border-border bg-bg p-2 text-sm"
      />
      <div className="max-h-48 overflow-auto rounded border border-border bg-bg">
        {filtered.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => add(u)}
            className="w-full px-3 py-2 text-left text-sm text-text hover:bg-divider"
          >
            {u.fullName} <span className="text-xs opacity-60">{u.email}</span>
          </button>
        ))}
        {filtered.length === 0 && <p className="p-2 text-xs opacity-60">No more people to add</p>}
      </div>
    </div>
  );
}
