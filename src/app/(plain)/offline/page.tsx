export default function Offline() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-5xl">📴</p>
      <h1 className="text-xl font-bold text-brand">You&apos;re offline</h1>
      <p className="text-sm text-gray-600">Check your data or Wi-Fi, then try again.</p>
    </main>
  );
}
