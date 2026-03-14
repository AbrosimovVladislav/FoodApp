import type { Metadata } from "next";
import "./globals.css";
import { Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";
import { cn } from "@/lib/utils";

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "FoodApp",
  description: "FoodApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(instrumentSerif.variable, plusJakartaSans.variable)}>
      <body>{children}</body>
    </html>
  );
}
