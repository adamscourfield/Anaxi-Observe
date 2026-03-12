import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-bg text-text">
        <header className="sticky top-0 z-40 border-b border-border/60 bg-surface/70 backdrop-blur-2xl">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3.5 md:px-6">
            <Link href="/" className="group flex items-center gap-3 text-[18px] font-semibold tracking-[-0.01em]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-bg/40 shadow-sm calm-transition group-hover:border-accent/30 group-hover:shadow-md">
                <Image src="/anaxi-logo.png" alt="Anaxi" width={24} height={24} priority className="h-6 w-6 object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="calm-transition group-hover:text-accent">Anaxi</span>
                <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">School operations</span>
              </span>
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                className="calm-transition rounded-xl border border-border/60 bg-bg/25 px-4 py-2 text-sm font-medium text-muted hover:border-border hover:bg-divider/80 hover:text-text"
                type="submit"
              >
                Log out
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-6">{children}</main>
      </body>
    </html>
  );
}
