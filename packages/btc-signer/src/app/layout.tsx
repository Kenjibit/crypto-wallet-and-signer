import type { Metadata, Viewport } from 'next';
import './styles/globals.css';
import './styles/ios-pwa.css';
import PWAProvider from './components/PWAProvider';

export const metadata: Metadata = {
  title: 'BTC Transaction Signer',
  description: 'Offline Bitcoin transaction signer for air-gapped security',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'BTC Signer',
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#f7931a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // Add iOS-specific viewport settings
  interactiveWidget: 'resizes-content',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />

        {/* iOS PWA Meta Tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <meta name="apple-mobile-web-app-title" content="BTC Signer" />
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Critical PWA Meta Tags - Prevent Browser Opening */}
        <meta name="application-name" content="BTC Signer" />
        <meta name="msapplication-TileColor" content="#f7931a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="theme-color" content="#f7931a" />
        <meta name="color-scheme" content="dark" />

        {/* iOS 17+ Enhanced PWA Support */}
        <meta name="apple-touch-fullscreen" content="yes" />
        <meta name="apple-mobile-web-app-orientations" content="portrait" />
        <meta name="apple-mobile-web-app-status-bar-inset" content="auto" />

        {/* iOS Safe Area Support */}
        <meta name="viewport-fit" content="cover" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />

        {/* iOS 15+ Enhanced PWA Support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="BTC Signer" />
        <meta name="apple-mobile-web-app-status-bar-inset" content="auto" />

        {/* PWA Installation Hints */}
        <meta name="msapplication-TileColor" content="#f7931a" />
        <meta name="msapplication-config" content="/browserconfig.xml" />

        {/* iOS Icon Links */}
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512x512.png" />

        {/* iPhone Splash Screens */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-640x1136.png"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-750x1334.png"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-1242x2208.png"
          media="(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-1125x2436.png"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-828x1792.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash-1242x2688.png"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 15 Pro Max, iPhone 15 Plus */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 15 Pro, iPhone 15 */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1179x2556.png"
          media="(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro Max, iPhone 13 Pro Max */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1290x2796.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Pro, iPhone 13 Pro */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1179x2556.png"
          media="(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14, iPhone 13 */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1170x2532.png"
          media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)"
        />
        {/* iPhone 14 Plus, iPhone 13 mini */}
        <link
          rel="apple-touch-startup-image"
          href="/splash-1284x2778.png"
          media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)"
        />
      </head>
      <body>
        <PWAProvider>{children}</PWAProvider>
      </body>
    </html>
  );
}
