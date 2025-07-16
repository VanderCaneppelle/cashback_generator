import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Cashback Generator - Mercado Livre",
    description: "Gere links de cashback para compras no Mercado Livre",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-BR">
            <body className="antialiased">{children}</body>
        </html>
    );
} 