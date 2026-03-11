import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-bg text-text">
        <header className="border-b border-border/80 bg-surface/75 backdrop-blur-xl">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-4 md:px-6">
            <Link href="/" className="flex items-center gap-3 text-[18px] font-semibold tracking-[-0.01em]">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-bg/35 shadow-sm">
                <Image src="/anaxi-logo.png" alt="Anaxi" width={24} height={24} priority className="h-6 w-6 object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span>Anaxi</span>
                <span className="mt-1 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">School operations</span>
              </span>
            </Link>
            <form action="/api/auth/signout" method="post">
              <button className="calm-transition rounded-xl border border-border/70 bg-bg/20 px-3.5 py-2 text-sm text-muted hover:bg-divider hover:text-text" type="submit">
                Logout
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-6">{children}</main>
      </body>
    </html>
  );
}
