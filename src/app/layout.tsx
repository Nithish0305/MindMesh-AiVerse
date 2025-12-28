import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'MindMesh AIverse',
  description: 'Agentic AI Application',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
  