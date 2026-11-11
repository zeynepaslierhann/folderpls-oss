import { redirect } from "next/navigation";

/** Tek panel var; kök adres ona gider. */
export default function DashboardPage() {
  redirect("/dashboard/google-drive");
}
