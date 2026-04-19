import type { Metadata } from "next";
import "./globals.css";
import { Marquee, Navbar, Footer } from "@/components/layout";

export const metadata: Metadata = {
  title: "WORKCHAIN | Smart Contract Freelancing",
  description: "Peer-to-peer labor protocol. Secure payments via immutable code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased font-mono">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@800,900&f[]=jet-brains-mono@400,700&display=swap"
          rel="stylesheet"
        />
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js" async></script>
      </head>
      <body className="min-h-full flex flex-col font-mono">
        {/* Global Noise Overlay */}
        <div className="fixed inset-0 grunge-bg z-[100] pointer-events-none mix-blend-overlay"></div>
        <Marquee />
        <main className="pt-12 relative flex-grow flex flex-col">
          <Navbar />
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
