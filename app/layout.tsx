import "./globals.css";
import Link from "next/link";
import Image from "next/image";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-bg text-text">
        <header className="sticky top-0 z-40 border-b border-border bg-white">
          <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-4 py-3 md:px-6">
            <Link href="/" className="group flex items-center gap-3 text-[18px] font-semibold tracking-[-0.01em]">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-white shadow-sm calm-transition group-hover:shadow-md">
                <Image src="/anaxi-logo.png" alt="Anaxi" width={22} height={22} priority className="h-[22px] w-[22px] object-contain" />
              </span>
              <span className="flex flex-col leading-none">
                <span className="calm-transition group-hover:text-accent">Anaxi</span>
                <span className="mt-0.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">School operations</span>
              </span>
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                className="calm-transition rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-muted hover:border-border hover:bg-bg hover:text-text"
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
