import type { Metadata } from 'next'
import { Archivo, Figtree, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const archivo = Archivo({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-archivo' })
const figtree = Figtree({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-figtree' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'Fren',
  description: 'Get tipped when users love your product.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${figtree.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  )
}
