import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'İş Başvuru Sistemi',
  description: 'Kariyerinizde yeni bir adım atın',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <body className="bg-gray-50">
        {children}
      </body>
    </html>
  )
}
