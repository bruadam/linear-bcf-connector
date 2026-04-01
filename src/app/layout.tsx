import type { Metadata } from "next";
import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

export const metadata: Metadata = {
  title: "Linear BCF Connector",
  description: "Connect Solibri with Linear using the BCF Live Connector",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
