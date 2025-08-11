# iOS PWA Testing Guide for BTC Signer

## Overview

This guide covers testing the BTC Signer Progressive Web App (PWA) specifically on iOS devices running iOS 15 or later.

## iOS PWA Support

- **iOS 15+**: Full PWA support including service workers, offline functionality, and installation
- **iOS 14.3-14.8**: Limited PWA support (no service workers)
- **iOS < 14.3**: No PWA support

## Prerequisites

### 1. Generate Required Assets

Before testing, you need to generate the icons and splash screens:

1. **Open the icon generator**: `packages/btc-signer/public/generate-ios-icons.html`
2. **Download all icons**:
   - `icon-180x180.png` (iOS home screen)
   - `icon-192x192.png` (Android)
   - `icon-512x512.png` (High resolution)
3. **Open the splash screen generator**: `packages/btc-signer/public/generate-splash-screens.html`
4. **Download all splash screens** for different iPhone sizes

### 2. Build and Deploy

```bash
# Build the application
npm run --workspace=btc-signer build

# Start the development server
npm run --workspace=btc-signer dev
```

## Testing Steps

### Step 1: Basic PWA Detection

1. Open Safari on iOS device
2. Navigate to your BTC Signer app
3. Tap the Share button (square with arrow up)
4. Look for "Add to Home Screen" option
5. If visible, the PWA is properly configured

### Step 2: Installation Testing

1. Tap "Add to Home Screen"
2. Customize the name if desired
3. Tap "Add"
4. Verify the app appears on your home screen
5. Launch the app from the home screen icon

### Step 3: App Experience Testing

1. **Launch**: App should open in full-screen mode (no Safari UI)
2. **Status Bar**: Should be black-translucent (matches app theme)
3. **Orientation**: Should lock to portrait mode
4. **Navigation**: Should feel like a native app

### Step 4: Offline Functionality Testing

1. **Initial Load**: Load the app completely while online
2. **Go Offline**:
   - Enable Airplane Mode, or
   - Turn off WiFi and cellular data
3. **Test Signing**: Try to sign a PSBT transaction
4. **Verify**: App should work offline for core functionality

### Step 5: Service Worker Testing

1. **Registration**: Check Safari DevTools → Storage → Service Workers
2. **Caching**: Verify resources are cached
3. **Updates**: Test service worker updates

## iOS-Specific Features

### 1. Splash Screens

- App shows custom splash screen during launch
- Different sizes for different iPhone models
- Matches app theme and branding

### 2. Home Screen Icon

- 180x180px icon for iOS home screen
- Properly sized and formatted
- No white borders or padding

### 3. Status Bar

- Black-translucent status bar style
- Integrates with app design
- Full-screen immersive experience

### 4. Touch Interactions

- Optimized for touch input
- Proper touch target sizes (44px minimum)
- Smooth scrolling and animations

## Common iOS PWA Issues

### 1. "Add to Home Screen" Not Visible

**Cause**: Missing required meta tags or manifest
**Solution**: Verify all iOS meta tags are present in `layout.tsx`

### 2. App Opens in Safari Instead of Full-Screen

**Cause**: Incorrect `apple-mobile-web-app-capable` setting
**Solution**: Ensure meta tag is set to `"yes"`

### 3. Splash Screen Not Showing

**Cause**: Missing splash screen images or incorrect media queries
**Solution**: Generate all required splash screen sizes

### 4. Service Worker Not Working

**Cause**: iOS version below 15 or HTTPS issues
**Solution**: Ensure iOS 15+ and HTTPS connection

### 5. Offline Mode Not Working

**Cause**: Service worker not caching resources properly
**Solution**: Check service worker registration and cache strategy

## Testing Checklist

### ✅ PWA Installation

- [ ] "Add to Home Screen" option visible
- [ ] App installs successfully
- [ ] App appears on home screen
- [ ] App launches from home screen

### ✅ App Experience

- [ ] Full-screen mode (no Safari UI)
- [ ] Proper status bar styling
- [ ] Portrait orientation lock
- [ ] Native app feel

### ✅ Offline Functionality

- [ ] App loads offline after initial cache
- [ ] PSBT signing works offline
- [ ] Service worker active
- [ ] Resources properly cached

### ✅ iOS-Specific Features

- [ ] Custom splash screen on launch
- [ ] Proper home screen icon
- [ ] Touch-optimized interface
- [ ] Smooth animations

## Debugging Tools

### 1. Safari Web Inspector (iOS 15+)

- Connect iOS device to Mac
- Use Safari Web Inspector
- Check Console, Network, and Storage tabs

### 2. iOS Simulator

- Test on iOS Simulator for development
- Simulate different device sizes
- Test offline scenarios

### 3. Browser Console

- Check for JavaScript errors
- Verify service worker registration
- Monitor network requests

## Performance Considerations

### 1. Bundle Size

- Keep initial bundle under 250KB
- Use code splitting for larger apps
- Optimize images and assets

### 2. Loading Speed

- Minimize time to interactive
- Optimize critical rendering path
- Use efficient caching strategies

### 3. Memory Usage

- Monitor memory consumption
- Clean up unused resources
- Optimize for mobile devices

## Security Best Practices

### 1. HTTPS Required

- PWA features require HTTPS
- Use valid SSL certificates
- Redirect HTTP to HTTPS

### 2. Content Security Policy

- Implement strict CSP headers
- Restrict resource loading
- Prevent XSS attacks

### 3. Service Worker Security

- Validate cached resources
- Implement proper error handling
- Secure offline functionality

## Deployment Checklist

### ✅ Pre-Deployment

- [ ] All icons generated and placed in `/public`
- [ ] All splash screens generated and placed in `/public`
- [ ] Manifest file updated with correct paths
- [ ] iOS meta tags properly configured
- [ ] Service worker tested and working

### ✅ Post-Deployment

- [ ] HTTPS enabled and working
- [ ] PWA installable on iOS devices
- [ ] Offline functionality working
- [ ] Performance optimized
- [ ] Cross-device compatibility verified

## Support and Resources

### iOS PWA Documentation

- [Apple Developer PWA Guide](https://developer.apple.com/design/human-interface-guidelines/ios/user-interaction/web/)
- [WebKit PWA Support](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)

### Testing Tools

- [Lighthouse PWA Audit](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [WebPageTest](https://www.webpagetest.org/)

---

**Note**: This PWA is specifically designed for iOS 15+ devices and provides a native app experience for Bitcoin transaction signing with offline capabilities.
