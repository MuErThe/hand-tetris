import type { Metadata } from "next";
import { metadataFor } from "@/lib/games/registry";

export const metadata: Metadata = metadataFor("cutout");

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
