export default function Page({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <main>
      <header className="border-b border-lilac px-4 py-3 md:hidden">
        <h1 className="text-2xl font-extrabold text-brand">
          Campus<span className="rounded bg-accent px-1">Memes</span>
        </h1>
        <p className="text-xs text-gray-500">Student life, anonymous memes</p>
      </header>
      <section className="p-4 md:p-6">
        {title && <h2 className="mb-3 text-lg font-bold text-brand">{title}</h2>}
        {children}
      </section>
    </main>
  );
}
