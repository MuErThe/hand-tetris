import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Warm-Up — five minutes before the real work",
  description:
    "Four Squint games sampled fresh each day, chained into a five-minute ritual with streak tracking. Warm up before you open your design tools.",
  alternates: { canonical: "./" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
