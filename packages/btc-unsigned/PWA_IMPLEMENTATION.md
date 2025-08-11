# BTC Creator - PWA Implementation

This document describes the Progressive Web App (PWA) implementation for the BTC Creator app, which allows users to create and broadcast Bitcoin transactions with PSBT support.

## 🚀 PWA Features

### Core PWA Functionality

- **Installable**: Can be installed on home screen across all devices
- **Offline Capable**: Works offline with cached assets
- **Responsive**: Optimized for all screen sizes and orientations
- **Fast**: Service worker caching for instant loading
- **Native-like**: Full-screen experience with app-like behavior

### Device Support

- **iOS**: Full PWA support with safe area handling
- **Android**: Native install prompts and PWA features
- **Desktop**: Browser-based installation and PWA features
- **Tablets**: Responsive design with touch optimization

## 📱 Installation Instructions

### iOS (iPhone/iPad)

1. Open the app in Safari
2. Tap the Share button (📤)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add" to confirm
5. The app will appear on your home screen

### Android

1. Open the app in Chrome
2. Look for the install prompt banner
3. Tap "Install" or "Add to Home Screen"
4. Confirm the installation
5. The app will appear on your home screen

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar
2. Click the install icon
3. Confirm the installation
4. The app will open in a standalone window

## 🛠️ Technical Implementation

### Service Worker (`/public/sw.js`)

- **Cache Strategy**: Network-first for critical assets, cache-first for others
- **Offline Support**: Serves cached content when offline
- **Dynamic Caching**: Automatically caches Next.js generated assets
- **Version Management**: Handles cache updates and cleanup

### PWA Manifest (`/src/app/manifest.json`)

- **App Identity**: Name, description, and icons
- **Display Mode**: Standalone for app-like experience
- **Theme Colors**: Bitcoin orange (#f7931a) theme
- **Shortcuts**: Quick access to key features

### PWA Provider (`/src/app/components/PWAProvider.tsx`)

- **Device Detection**: iOS/Android/PWA mode detection
- **Service Worker Management**: Registration and update handling
- **Safe Area Support**: iOS notch and home indicator handling
- **Offline Detection**: Network status monitoring

### PWA Components

- **InstallPrompt**: Shows installation prompt for eligible users
- **OfflineIndicator**: Displays offline status banner
- **PWA Layout**: Enhanced layout with PWA meta tags

## 🎨 UI/UX Features

### iOS PWA Optimizations

- **Safe Area Support**: Respects iPhone notch and home indicator
- **Status Bar**: Black-translucent status bar styling
- **Touch Targets**: Minimum 44px touch targets for iOS
- **Splash Screens**: Optimized splash screens for all iPhone models

### Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Touch Friendly**: Large touch targets and smooth interactions
- **Orientation Support**: Works in portrait and landscape
- **Device Adaptation**: Adjusts layout for different screen sizes

## 📁 File Structure

```
packages/btc-unsigned/
├── src/app/
│   ├── components/
│   │   ├── PWAProvider.tsx          # Main PWA provider
│   │   ├── InstallPrompt.tsx        # Installation prompt
│   │   ├── OfflineIndicator.tsx     # Offline status indicator
│   │   └── ...                      # Other components
│   ├── styles/
│   │   ├── ios-pwa.css              # iOS PWA specific styles
│   │   └── ...                      # Other styles
│   ├── layout.tsx                   # PWA-enhanced layout
│   └── manifest.json                # PWA manifest
├── public/
│   ├── sw.js                        # Service worker
│   ├── offline.html                 # Offline page
│   ├── offline-debug.html           # Debug page
│   ├── pwa-test.html                # PWA testing page
│   ├── browserconfig.xml            # Windows tile config
│   ├── icon-*.png                   # App icons
│   └── splash-*.png                 # Splash screens
└── PWA_IMPLEMENTATION.md            # This file
```

## 🧪 Testing

### PWA Testing Page

Visit `/pwa-test.html` to test PWA functionality:

- Installation status
- Service worker status
- Cache information
- Device detection

### Offline Testing

1. Load the app in your browser
2. Open DevTools → Application → Service Workers
3. Check "Offline" checkbox
4. Refresh the page to test offline functionality

### Installation Testing

1. Use Chrome DevTools → Application → Manifest
2. Check PWA installation criteria
3. Test install prompt functionality

## 🔧 Configuration

### Customizing the PWA

- **App Name**: Update `manifest.json` and layout meta tags
- **Colors**: Modify theme colors in manifest and CSS
- **Icons**: Replace icon files in `/public/` directory
- **Splash Screens**: Generate new splash screens for different devices

### Service Worker Configuration

- **Cache Name**: Update `CACHE_NAME` in `sw.js`
- **Caching Strategy**: Modify cache strategies for different asset types
- **Update Frequency**: Adjust cache update intervals

## 📊 Performance

### Caching Benefits

- **Faster Loading**: Cached assets load instantly
- **Offline Access**: Core functionality works without internet
- **Reduced Bandwidth**: Assets served from cache
- **Better UX**: Consistent performance across network conditions

### Optimization Features

- **Lazy Loading**: Assets cached on-demand
- **Version Management**: Automatic cache updates
- **Size Optimization**: Efficient asset compression
- **Network Fallback**: Graceful degradation when offline

## 🚨 Troubleshooting

### Common Issues

#### PWA Not Installing

- Check if HTTPS is enabled (required for PWA)
- Verify manifest.json is accessible
- Ensure service worker is registered
- Check browser compatibility

#### Offline Not Working

- Verify service worker is active
- Check cache contents in DevTools
- Clear and re-register service worker
- Test with network throttling

#### iOS Issues

- Ensure using Safari (not in-app browser)
- Check safe area CSS variables
- Verify splash screen dimensions
- Test on different iPhone models

### Debug Tools

- **Chrome DevTools**: Application tab for PWA debugging
- **Safari Web Inspector**: iOS PWA debugging
- **Offline Debug Page**: Built-in debugging tools
- **Console Logs**: Detailed PWA status logging

## 🔄 Updates

### Service Worker Updates

- Automatic updates when new version is available
- User notification of available updates
- Seamless update process
- Cache cleanup for old versions

### App Updates

- Version tracking in service worker
- Cache invalidation strategies
- User experience during updates
- Rollback capabilities

## 📚 Resources

### PWA Documentation

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)

### iOS PWA Resources

- [Safari PWA Guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)
- [iOS PWA Best Practices](https://medium.com/@firt/ios-13-3-3-is-out-and-so-is-pwa-support-8c9c1dd9439d)

### Testing Tools

- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Chrome DevTools PWA](https://developers.google.com/web/tools/chrome-devtools/progressive-web-apps)

## 🤝 Contributing

### Adding New PWA Features

1. Update service worker for new caching needs
2. Add appropriate meta tags to layout
3. Test on multiple devices and browsers
4. Update documentation and testing tools

### PWA Testing Checklist

- [ ] Installable on all target platforms
- [ ] Offline functionality works correctly
- [ ] Service worker updates properly
- [ ] Safe areas handled correctly on iOS
- [ ] Touch targets meet accessibility standards
- [ ] Performance metrics meet PWA requirements

---

**Note**: This PWA implementation follows the same pattern as the BTC Signer app, ensuring consistency across the Bitcoin wallet ecosystem.
