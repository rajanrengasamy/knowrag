import type { Metadata } from "next";
import { Syne, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * Typography System - Editorial Premium Design
 * 
 * Syne: Bold, geometric display font for headlines
 * Geist: Clean, modern sans-serif for body text  
 * Geist Mono: Technical monospace for code/data
 */
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KnowRAG — AI-Powered Knowledge Base",
  description: "Query your PDF knowledge base with AI-powered semantic search and accurate citations. Built with precision.",
  keywords: ["RAG", "AI", "PDF", "Knowledge Base", "Semantic Search", "Citations", "LLM"],
  authors: [{ name: "KnowRAG" }],
  openGraph: {
    title: "KnowRAG — AI-Powered Knowledge Base",
    description: "Query your PDF knowledge base with AI-powered semantic search and accurate citations.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${syne.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}>
        <div className="noise-overlay" />
        {children}
      </body>
    </html>
  );
}
