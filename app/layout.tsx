import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mandamenu.com'),
  title: {
    default: 'MandaMenu — Menú digital con QR para restaurantes',
    template: '%s | MandaMenu',
  },
  description: 'Creá tu menú digital con QR, recibí pedidos en tiempo real y gestioná tu restaurante desde un panel simple. Gratis 30 días. Sin tarjeta de crédito.',
  keywords: [
    'menú digital restaurante',
    'carta digital QR',
    'menú QR restaurante',
    'pedidos online restaurante',
    'software para restaurantes',
    'carta digital gratis',
    'menú digital Colombia',
    'menú digital Argentina',
    'menú digital México',
    'sistema de pedidos restaurante',
    'gestión de pedidos restaurante',
    'menú digital para WhatsApp',
    'carta digital restaurante Colombia',
    'carta digital restaurante Argentina',
    'carta digital restaurante México',
    'pedidos en línea restaurante',
    'delivery restaurante online',
    'menú digital food truck',
    'carta QR gratis',
    'MandaMenu',
  ],
  authors: [{ name: 'MandaMenu', url: 'https://mandamenu.com' }],
  creator: 'MandaMenu',
  publisher: 'MandaMenu',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'MandaMenu — Menú digital con QR para restaurantes',
    description: 'Creá tu menú digital con QR, recibí pedidos en tiempo real y gestioná tu restaurante desde un panel simple. Gratis 30 días.',
    url: 'https://mandamenu.com',
    siteName: 'MandaMenu',
    locale: 'es_419',
    type: 'website',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'MandaMenu — Menú digital para restaurantes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MandaMenu — Menú digital con QR para restaurantes',
    description: 'Creá tu menú digital con QR, recibí pedidos en tiempo real y gestioná tu restaurante desde un panel simple.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://mandamenu.com',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
