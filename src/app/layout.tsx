import type { Metadata } from "next";
import "./globals.css";
import "./tournament.css";

export const metadata: Metadata = {
  title: "iConnect Sequence Cup | Tournament Manager",
  description: "Track teams, fixtures, standings, and knockouts for the iConnect Sequence Cup.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
