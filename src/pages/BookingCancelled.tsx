import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function BookingCancelled() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <XCircle className="mx-auto h-14 w-14 text-navy-700/30" />
      <h1 className="mt-4 text-2xl font-bold text-navy-950">Checkout cancelled</h1>
      <p className="mt-1 text-navy-700/70">No payment was made and no seats were reserved.</p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-lg bg-navy-950 px-6 py-2.5 font-bold text-white transition hover:bg-navy-800"
      >
        Search flights again
      </Link>
    </div>
  );
}
