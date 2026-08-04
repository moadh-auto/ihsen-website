import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CartFAB from "@/components/CartFAB";
import RevealObserver from "@/components/RevealObserver";

export const metadata: Metadata = {
  title: "إحسان — Ihsen | أزياء محتشمة راقية",
  description: "إحسان — وجهتكِ الأولى للملابس النسائية المحتشمة والراقية. فولار، حجاب، عبايات، هوديز — توصيل لـ 69 ولاية، الدفع عند الاستلام.",
  keywords: ["ihsen", "إحسان", "ملابس محتشمة", "حجاب", "عباية", "الجزائر", "mode modeste algerie"],
  icons: {
    icon: [
      { url: '/logos/icon-gold.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/logos/icon-gold.svg',
    apple: '/logos/icon-gold.svg',
  },
  openGraph: {
    title: "إحسان — Ihsen",
    description: "أزياء محتشمة راقية للمرأة الجزائرية",
    locale: "ar_DZ",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" data-theme="light" data-lang="ar">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <CartProvider>
          <RevealObserver />
          {children}
          <CartDrawer />
          <CartFAB />
        </CartProvider>
      </body>
    </html>
  );
}
