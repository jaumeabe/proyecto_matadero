import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Prevision Visitador - Premier Pigs',
  description: 'Formulario de prevision de cargas para visitadores',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
