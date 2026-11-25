import { redirect } from "next/navigation";

/** The Therapy & Counseling Center now lives in the universal Counseling & Wellness Center. */
export default function Professionals() {
  redirect("/app/wellness");
}
