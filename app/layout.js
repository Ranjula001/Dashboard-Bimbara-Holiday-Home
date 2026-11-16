import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import AppFrame from "@/components/AppFrame";

export const metadata = {
  title: "BIMBARA Holiday Home",
  description: "Bookings, guests and payments for BIMBARA Holiday Home, Anuradhapura",
};

export const viewport = {
  themeColor: "#151517",
};

// The frame around every page of the app
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark h-full ${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <AppFrame>{children}</AppFrame>
      </body>
    </html>
  );
}
