import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CHO Sport',
  description:
    'Planificador de carbohidratos, hidratación y sodio para deportistas de resistencia.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        {/* Manifest PWA */}
        <link rel="manifest" href="/manifest.json" />
        {/* Icono principal */}
        <link rel="icon" href="/icons/cho-192.png" />
        {/* Color de la barra del navegador / PWA */}
        <meta name="theme-color" content="#0f172a" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="bg-slate-100">
        {children}
      </body>
    </html>
  );
}
