import Link from "next/link";
import Image from "next/image";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-white">
        <div className="flex items-center justify-between px-5 py-3">
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center">
              <Image src="/anaxi-logo.png" alt="Anaxi" width={22} height={22} priority className="h-[22px] w-[22px] object-contain" />
            </span>
            <span className="text-[15px] font-bold tracking-[-0.02em] text-text calm-transition group-hover:text-accent">Anaxi</span>
          </Link>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
