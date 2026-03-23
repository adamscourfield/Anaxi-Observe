"use client";

export function PrintExportButtons() {
  return (
    <div className="flex shrink-0 items-center gap-2 print:hidden">
      <button
        onClick={() => {
          const style = document.createElement("style");
          style.id = "__pdf-export-hint";
          style.textContent = "@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }";
          document.head.appendChild(style);
          window.print();
          setTimeout(() => document.getElementById("__pdf-export-hint")?.remove(), 1000);
        }}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-container-lowest/70 px-3.5 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:border-accent/30 hover:text-text"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
        Export to PDF
      </button>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-container-lowest/70 px-3.5 py-2 text-[0.8125rem] font-medium text-muted calm-transition hover:border-accent/30 hover:text-text"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
        Print
      </button>
    </div>
  );
}
