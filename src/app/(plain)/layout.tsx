/** Sign-up, house rules, privacy and offline pages: a centred card on big screens, full width on phones. */
export default function PlainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:bg-lilac md:px-6 md:py-10">
      <div className="mx-auto min-h-dvh w-full max-w-md bg-white md:min-h-0 md:max-w-xl md:rounded-2xl md:shadow-sm">{children}</div>
    </div>
  );
}
