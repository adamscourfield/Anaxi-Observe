"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { FormSelect } from "@/components/ui/form-select";

interface Props {
  yearGroups: string[];
  currentQ: string;
  currentYearGroup: string;
  currentSend: string;
  currentPp: string;
  currentBand: string;
}

export function StudentsFilterBar({
  yearGroups,
  currentQ,
  currentYearGroup,
  currentSend,
  currentPp,
  currentBand,
}: Props) {
  const router = useRouter();
  const [q, setQ] = useState(currentQ);
  const [yearGroup, setYearGroup] = useState(currentYearGroup);
  const [send, setSend] = useState(currentSend);
  const [pp, setPp] = useState(currentPp);
  const [band, setBand] = useState(currentBand);
  const [, startTransition] = useTransition();

  const hasFilters = !!(q || yearGroup || send || pp || band);

  function apply() {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (yearGroup) params.set("yearGroup", yearGroup);
    if (send) params.set("send", send);
    if (pp) params.set("pp", pp);
    if (band) params.set("band", band);
    startTransition(() => {
      router.push(`/students?${params.toString()}`);
    });
  }

  function clear() {
    setQ("");
    setYearGroup("");
    setSend("");
    setPp("");
    setBand("");
    startTransition(() => {
      router.push("/students");
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && apply()}
        placeholder="Search by name or UPN…"
        className="field min-w-[200px] flex-1"
      />
      <FormSelect
        name="yearGroup"
        defaultValue={currentYearGroup}
        placeholder="All years"
        className="min-w-[130px]"
        options={yearGroups.map((yg) => ({ value: yg, label: yg }))}
        onChange={setYearGroup}
      />
      <FormSelect
        name="send"
        defaultValue={currentSend}
        placeholder="SEND"
        className="min-w-[110px]"
        options={[
          { value: "true", label: "SEND Yes" },
          { value: "false", label: "SEND No" },
        ]}
        onChange={setSend}
      />
      <FormSelect
        name="pp"
        defaultValue={currentPp}
        placeholder="PP"
        className="min-w-[110px]"
        options={[
          { value: "true", label: "PP Yes" },
          { value: "false", label: "PP No" },
        ]}
        onChange={setPp}
      />
      <FormSelect
        name="band"
        defaultValue={currentBand}
        placeholder="Band"
        className="min-w-[120px]"
        options={[
          { value: "STABLE", label: "Stable" },
          { value: "WATCH", label: "Watch" },
          { value: "PRIORITY", label: "Priority" },
          { value: "URGENT", label: "Urgent" },
        ]}
        onChange={setBand}
      />
      <button
        type="button"
        onClick={apply}
        className="calm-transition inline-flex items-center rounded-lg bg-accent px-4 py-2 text-[0.8125rem] font-semibold text-on-primary hover:bg-accentHover"
      >
        Apply
      </button>
      {hasFilters && (
        <button
          type="button"
          onClick={clear}
          className="calm-transition rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-muted hover:text-text"
        >
          Clear
        </button>
      )}
    </div>
  );
}
