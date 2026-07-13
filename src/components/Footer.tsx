export default function Footer() {
  return (
    <footer className="border-t border-navy-900/10 bg-white py-8 text-sm text-navy-700/60">
      <div className="mx-auto max-w-6xl px-6">
        <p>&copy; {new Date().getFullYear()} Aerion Airways. Demo booking app — not a real airline.</p>
      </div>
    </footer>
  );
}
