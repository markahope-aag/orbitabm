# OrbitABM — Favicon Installation

## Files Included

| File | Purpose | Size |
|------|---------|------|
| `favicon.ico` | Browser tab icon (legacy) | 16/32/48px |
| `icon-16x16.png` | Small favicon | 16px |
| `icon-32x32.png` | Standard favicon | 32px |
| `icon-192x192.png` | Android home screen | 192px |
| `icon-384x384.png` | Android splash | 384px |
| `icon-512x512.png` | PWA icon / app store | 512px |
| `apple-touch-icon.png` | iOS home screen | 180px |
| `og-image.png` | Social sharing preview | 1200x630 |
| `icon.svg` | Scalable icon (modern browsers) | Vector |
| `site.webmanifest` | PWA manifest | JSON |

## Installation (Next.js App Router)

### Step 1: Copy files to `public/`

Copy these files into your `public/` directory at the project root:

```
public/
├── favicon.ico
├── icon.svg
├── apple-touch-icon.png
├── icon-192x192.png
├── icon-384x384.png
├── icon-512x512.png
├── og-image.png
└── site.webmanifest
```

### Step 2: Update `src/app/layout.tsx`

Add metadata to your root layout:

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OrbitABM',
  description: 'Campaign Intelligence Platform',
  metadataBase: new URL('https://orbitabm.com'),
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'OrbitABM',
    description: 'Campaign Intelligence Platform',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OrbitABM',
    description: 'Campaign Intelligence Platform',
    images: ['/og-image.png'],
  },
}
```

That's it. Next.js App Router handles the rest automatically.
