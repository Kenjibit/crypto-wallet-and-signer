# BTC Signer PWA Testing Guide

## Overview

The BTC Signer has been configured as a Progressive Web App (PWA) that can work offline for signing Bitcoin transactions.

## PWA Features Implemented

### 1. **Service Worker** (`/sw.js`)

- Caches essential resources for offline use
- Handles network requests and serves cached content when offline
- Automatically updates when new versions are available

### 2. **Web App Manifest** (`/manifest.json`)

- Defines app metadata and installation behavior
- Sets theme colors and display mode
- Configures app icons and orientation

### 3. **Offline Functionality**

- App works offline after initial load
- Caches PSBT signing functionality
- Shows offline indicator when network is unavailable

### 4. **Installation Prompt**

- Encourages users to install the app
- Works on both mobile and desktop browsers
- Creates a native app-like experience

## Testing the PWA

### Prerequisites

1. Build the application: `npm run --workspace=btc-signer build`
2. Start the development server: `npm run --workspace=btc-signer dev`

### Testing Steps

#### 1. **Installation Testing**

- Open the app in Chrome/Edge
- Look for the install prompt or "Add to Home Screen" option
- Install the app and verify it appears in your app list

#### 2. **Offline Functionality Testing**

- Load the app completely (all resources cached)
- Disconnect from the internet
- Verify the app still works for PSBT signing
- Check that the offline indicator appears

#### 3. **Service Worker Testing**

- Open Chrome DevTools → Application → Service Workers
- Verify the service worker is registered
- Check the cache storage for cached resources
- Test offline mode by toggling "Offline" in DevTools

#### 4. **Mobile Testing**

- Test on mobile devices
- Verify the app can be added to home screen
- Test offline functionality on mobile
- Check responsive design and touch interactions

### Browser Support

#### **Full PWA Support**

- Chrome (Desktop & Mobile)
- Edge (Desktop & Mobile)
- Samsung Internet

#### **Partial PWA Support**

- Firefox (Desktop & Mobile)
- Safari (iOS 11.3+)

#### **Limited Support**

- Internet Explorer (not recommended)

## PWA Configuration Details

### Service Worker Strategy

- **Cache First**: Static resources are served from cache
- **Network First**: Dynamic requests try network first, fallback to cache
- **Offline Fallback**: Shows offline page when navigation fails

### Cached Resources

- Main app bundle
- CSS and JavaScript files
- App icons and manifest
- Offline page

### Installation Requirements

- HTTPS connection (required for service worker)
- Valid manifest file
- Service worker registration
- User interaction (click/tap)

## Troubleshooting

### Common Issues

#### **Service Worker Not Registering**

- Check browser console for errors
- Verify HTTPS connection
- Clear browser cache and reload

#### **Install Prompt Not Showing**

- Ensure all PWA criteria are met
- Check manifest file validity
- Verify service worker is active

#### **Offline Mode Not Working**

- Wait for initial page load to complete
- Check service worker cache
- Verify resources are being cached

### Debug Commands

```bash
# Check service worker status
navigator.serviceWorker.getRegistrations()

# Clear all caches
caches.keys().then(names => names.forEach(name => caches.delete(name)))

# Check manifest
navigator.standalone // iOS
window.matchMedia('(display-mode: standalone)').matches // Other platforms
```

## Performance Considerations

### **Bundle Size**

- Main bundle: ~123 kB
- Shared chunks: ~101 kB
- Optimized for mobile networks

### **Caching Strategy**

- Aggressive caching for offline use
- Minimal network requests after initial load
- Fast startup time for repeat visits

### **Mobile Optimization**

- Touch-friendly interface
- Responsive design
- Minimal battery usage

## Security Notes

- **Private Keys**: Never stored or transmitted
- **Local Processing**: All signing happens locally
- **No Network**: Signing works completely offline
- **Secure Context**: Requires HTTPS for PWA features

## Next Steps

1. **Test thoroughly** on various devices and browsers
2. **Monitor performance** and user experience
3. **Collect feedback** on PWA functionality
4. **Iterate** based on testing results
5. **Deploy** to production when ready

---

**Note**: This PWA is designed for air-gapped security scenarios where offline functionality is crucial for Bitcoin transaction signing.
