export default function GodLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-[1400px] px-6 py-8">
      {children}
    </main>
  );
}
