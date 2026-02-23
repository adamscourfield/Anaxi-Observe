import "./globals.css";
import Link from "next/link";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b bg-white p-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <Link href="/" className="font-bold">Anaxi</Link>
            <form action="/api/auth/signout" method="post">
              <button className="text-sm underline" type="submit">Logout</button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-6xl p-6">{children}</main>
      </body>
    </html>
  );
}
