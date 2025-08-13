const CACHE_NAME = 'btc-signer-1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/offline.html',
  '/offline-debug.html',
  '/icon-180x180.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/apple-touch-icon-precomposed.png',
  '/sw.js',
];

// Essential assets that should always be cached for offline use
const essentialAssets = [
  '/_next/static/css/app/layout.css',
  '/_next/static/css/app/page.css',
  '/_next/static/chunks/main-app.js',
  '/_next/static/chunks/app-pages-internals.js',
  '/_next/static/chunks/app/page.js',
  '/_next/static/chunks/app/layout.js',
  '/_next/static/chunks/polyfills.js',
];

// Dynamic asset patterns to match Next.js generated assets (including version parameters)
const assetPatterns = [
  /\/_next\/static\/css\/app\/.*\.css(\?.*)?$/,
  /\/_next\/static\/chunks\/.*\.js(\?.*)?$/,
];

// Font Awesome icons that need to be cached for offline use
const fontAwesomeIcons = [
  '/_next/static/media/fa-solid-900.woff2',
  '/_next/static/media/fa-solid-900.ttf',
  '/_next/static/media/fa-regular-400.woff2',
  '/_next/static/media/fa-regular-400.ttf',
];

// Device detection for optimized caching
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);
const isOldIOS =
  isIOS && /iPhone OS (7|8|9|10|11|12)/.test(navigator.userAgent);

// Enhanced cache strategy based on device type
const getCacheStrategy = (request) => {
  const url = request.url;
  const destination = request.destination;

  // For critical assets, use network-first with aggressive fallback
  if (
    destination === 'script' ||
    destination === 'style' ||
    url.includes('_next/static') ||
    url.includes('.css') ||
    url.includes('.js')
  ) {
    return 'network-first';
  }

  // For navigation requests, use cache-first with network fallback
  if (request.mode === 'navigate') {
    return 'cache-first';
  }

  // For images and other assets, use cache-first
  if (destination === 'image' || destination === 'font') {
    return 'cache-first';
  }

  // Default to cache-first for everything else
  return 'cache-first';
};

// Install event - enhanced caching for all devices
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...', {
    isIOS,
    isAndroid,
    isOldIOS,
    userAgent: navigator.userAgent,
    cacheName: CACHE_NAME,
  });

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache:', CACHE_NAME);

        // Convert relative URLs to absolute URLs for proper caching
        const absoluteUrls = urlsToCache.map((url) => {
          if (url.startsWith('/')) {
            return new URL(url, self.location.origin).href;
          }
          return url;
        });

        console.log('Caching essential URLs:', absoluteUrls);

        // Cache essential resources
        return cache.addAll(absoluteUrls);
      })
      .then(() => {
        // Enhanced dynamic asset caching for better offline support
        return fetch('/')
          .then((response) => response.text())
          .then((html) => {
            // Extract CSS and JS asset URLs from the HTML (including version parameters)
            const cssMatches =
              html.match(/href="([^"]*_next[^"]*\.css[^"]*)"/g) || [];
            const jsMatches =
              html.match(/src="([^"]*_next[^"]*\.js[^"]*)"/g) || [];
            const fontAwesomeMatches =
              html.match(/href="([^"]*font-awesome[^"]*\.css[^"]*)"/g) || [];

            const cssUrls = cssMatches.map((match) => {
              const url = match.match(/href="([^"]*)"/)[1];
              return url.startsWith('/') ? url : `/${url}`;
            });

            const jsUrls = jsMatches.map((match) => {
              const url = match.match(/src="([^"]*)"/)[1];
              return url.startsWith('/') ? url : `/${url}`;
            });

            const fontAwesomeUrls = fontAwesomeMatches.map((match) => {
              const url = match.match(/href="([^"]*)"/)[1];
              return url.startsWith('/') ? url : `/${url}`;
            });

            const allAssetUrls = [...cssUrls, ...jsUrls, ...fontAwesomeUrls];
            console.log('SW: Found assets to cache:', allAssetUrls);

            if (allAssetUrls.length > 0) {
              return caches.open(CACHE_NAME).then((cache) => {
                const assetPromises = allAssetUrls.map((assetUrl) => {
                  const absoluteUrl = new URL(assetUrl, self.location.origin)
                    .href;
                  return fetch(absoluteUrl, {
                    cache: 'no-cache',
                    headers: {
                      'Cache-Control': 'no-cache',
                    },
                  })
                    .then((response) => {
                      if (response.ok) {
                        console.log('SW: Caching dynamic asset:', assetUrl);
                        return cache.put(absoluteUrl, response);
                      } else {
                        console.log(
                          'SW: Dynamic asset not available for caching:',
                          assetUrl,
                          response.status
                        );
                        return Promise.resolve();
                      }
                    })
                    .catch((error) => {
                      console.log(
                        'SW: Failed to cache dynamic asset:',
                        assetUrl,
                        error
                      );
                      return Promise.resolve();
                    });
                });

                return Promise.allSettled(assetPromises);
              });
            }

            return Promise.resolve();
          })
          .catch((error) => {
            console.log(
              'SW: Failed to fetch main page for dynamic caching:',
              error
            );
            return Promise.resolve();
          });
      })
      .then((results) => {
        console.log('SW: Cache installation completed with results:', results);

        // Force activation for immediate offline support
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('SW: Cache installation failed:', error);
      })
  );
});

// Enhanced fetch event with better offline support
self.addEventListener('fetch', (event) => {
  console.log('SW: Fetch event triggered for:', event.request.url);
  const requestUrl = event.request.url;
  const requestMode = event.request.mode;
  const requestDestination = event.request.destination;

  // Debug endpoint to check cache contents
  if (requestUrl.includes('/sw-debug')) {
    event.respondWith(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.open(cacheName))
        ).then((caches) => {
          const promises = caches.map((cache) =>
            cache.keys().then((requests) =>
              requests.map((req) => ({
                url: req.url,
                destination: req.destination,
                mode: req.mode,
              }))
            )
          );

          return Promise.all(promises).then((allRequests) => {
            const allAssets = allRequests.flat();
            const debugInfo = {
              cacheNames,
              totalAssets: allAssets.length,
              cssAssets: allAssets.filter((asset) =>
                asset.url.includes('.css')
              ),
              jsAssets: allAssets.filter((asset) => asset.url.includes('.js')),
              allAssets: allAssets.map((asset) => asset.url),
              deviceInfo: {
                isIOS,
                isAndroid,
                isOldIOS,
                userAgent: navigator.userAgent,
              },
            };

            return new Response(JSON.stringify(debugInfo, null, 2), {
              headers: { 'Content-Type': 'application/json' },
            });
          });
        });
      })
    );
    return;
  }

  // Skip requests with unsupported schemes
  if (
    event.request.url.startsWith('chrome-extension://') ||
    event.request.url.startsWith('moz-extension://') ||
    event.request.url.startsWith('safari-extension://') ||
    event.request.url.startsWith('ms-browser-extension://') ||
    event.request.url.includes('chrome-extension') ||
    event.request.url.includes('moz-extension') ||
    event.request.url.includes('safari-extension') ||
    event.request.url.includes('ms-browser-extension')
  ) {
    console.log('Skipping extension request:', event.request.url);
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-HTTP/HTTPS requests
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Only handle requests from our domain
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Enhanced navigation handling for better offline support
  if (event.request.mode === 'navigate') {
    console.log('SW: Handling navigation request to:', requestUrl);
    event.respondWith(
      caches.match(event.request).then((response) => {
        if (response) {
          console.log('SW: Serving cached navigation response');
          return response;
        }

        console.log('SW: No cached navigation, trying network');
        return fetch(event.request).catch((error) => {
          console.log(
            'SW: Network failed for navigation, serving offline page'
          );
          return caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // Enhanced Font Awesome handling for offline icon support
  if (
    requestUrl.includes('font-awesome') ||
    requestUrl.includes('cdnjs.cloudflare.com')
  ) {
    console.log('SW: Handling Font Awesome request:', requestUrl);
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          console.log('SW: Serving cached Font Awesome CSS');
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            if (response && response.status === 200) {
              const responseToCache = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache).catch((error) => {
                  console.log('SW: Failed to cache Font Awesome CSS:', error);
                });
              });
            }
            return response;
          })
          .catch((error) => {
            console.log(
              'SW: Font Awesome fetch failed, trying to serve from essential assets'
            );
            return caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => caches.open(cacheName))
              ).then((caches) => {
                const promises = caches.map((cache) =>
                  cache
                    .keys()
                    .then((requests) =>
                      requests.filter(
                        (req) =>
                          req.destination === 'style' ||
                          req.url.includes('.css')
                      )
                    )
                );

                return Promise.all(promises).then((allRequests) => {
                  const allAssets = allRequests.flat();
                  if (allAssets.length > 0) {
                    return caches.match(allAssets[0]);
                  }
                  return null;
                });
              });
            });
          });
      })
    );
    return;
  }

  // Enhanced critical asset handling with better fallback strategies
  if (
    event.request.destination === 'script' ||
    event.request.destination === 'style' ||
    event.request.url.includes('_next/static') ||
    event.request.url.includes('.css') ||
    event.request.url.includes('.js')
  ) {
    console.log('SW: Handling critical asset (network-first):', requestUrl);
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          console.log('SW: Critical asset network response:', response.status);
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            const responseForVersionAgnostic = response.clone();

            caches.open(CACHE_NAME).then((cache) => {
              const cachePromises = [cache.put(event.request, responseToCache)];

              if (requestUrl.includes('.css')) {
                const versionAgnosticUrl = requestUrl.split('?')[0];
                const versionAgnosticRequest = new Request(versionAgnosticUrl);
                cachePromises.push(
                  cache.put(versionAgnosticRequest, responseForVersionAgnostic)
                );
              }

              Promise.all(cachePromises).catch((error) => {
                console.log('SW: Cache put failed for critical asset:', error);
              });
            });
          }
          return response;
        })
        .catch((error) => {
          console.log(
            'SW: Critical asset network failed, trying cache:',
            error
          );
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('SW: Serving cached critical asset');
              return cachedResponse;
            }

            // Enhanced fallback strategy for CSS files
            if (requestUrl.includes('.css')) {
              const versionAgnosticUrl = requestUrl.split('?')[0];
              const versionAgnosticRequest = new Request(versionAgnosticUrl);
              return caches
                .match(versionAgnosticRequest)
                .then((cachedResponse) => {
                  if (cachedResponse) {
                    console.log('SW: Serving version-agnostic cached CSS');
                    return cachedResponse;
                  }
                  return null;
                });
            }

            // Enhanced fallback for critical assets
            return caches.keys().then((cacheNames) => {
              return Promise.all(
                cacheNames.map((cacheName) => caches.open(cacheName))
              ).then((caches) => {
                const promises = caches.map((cache) =>
                  cache.keys().then((requests) => {
                    if (
                      event.request.destination === 'style' ||
                      requestUrl.includes('.css')
                    ) {
                      return requests.filter(
                        (req) =>
                          req.destination === 'style' ||
                          req.url.includes('.css')
                      );
                    } else if (
                      event.request.destination === 'script' ||
                      requestUrl.includes('.js')
                    ) {
                      return requests.filter(
                        (req) =>
                          req.destination === 'script' ||
                          req.url.includes('.js')
                      );
                    }
                    return [];
                  })
                );

                return Promise.all(promises).then((allRequests) => {
                  const allAssets = allRequests.flat();
                  if (allAssets.length > 0) {
                    return caches.match(allAssets[0]);
                  }
                  return null;
                });
              });
            });
          });
        })
    );
    return;
  }

  // Enhanced cache-first strategy for other requests
  console.log('SW: Handling other request (cache-first):', requestUrl);
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) {
        console.log('SW: Serving cached response');
        return response;
      }

      console.log('SW: No cache hit, fetching from network');
      const fetchRequest = event.request.clone();

      return fetch(fetchRequest)
        .then((response) => {
          console.log('SW: Network response status:', response.status);
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic'
          ) {
            return response;
          }

          const responseToCache = response.clone();
          try {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache).catch((error) => {
                console.log('Cache put failed:', error);
              });
            });
          } catch (error) {
            console.log('Cache operation failed:', error);
          }

          return response;
        })
        .catch((error) => {
          console.log('SW: Fetch failed, serving offline content:', error);

          if (event.request.destination === 'image') {
            console.log('SW: Serving fallback image');
            return caches.match('/icon-180x180.png');
          }

          console.log('SW: Serving offline fallback');
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' },
          });
        });
    })
  );
});

// Enhanced activate event with better cache management
self.addEventListener('activate', (event) => {
  console.log('SW: Activating new service worker');
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Enhanced message handling for better device support
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      deviceInfo: {
        isIOS,
        isAndroid,
        isOldIOS,
        userAgent: navigator.userAgent,
      },
    });
  }

  // Enhanced offline status reporting
  if (event.data && event.data.type === 'GET_OFFLINE_STATUS') {
    event.ports[0].postMessage({
      isOffline: !navigator.onLine,
      cacheName: CACHE_NAME,
      deviceInfo: {
        isIOS,
        isAndroid,
        isOldIOS,
        userAgent: navigator.userAgent,
      },
    });
  }
});

// Enhanced install prompt handling for better PWA installation
self.addEventListener('beforeinstallprompt', (event) => {
  console.log('Before install prompt event:', event);
  // Store the event for later use
  self.deferredPrompt = event;
});

// Enhanced app installed handling
self.addEventListener('appinstalled', (event) => {
  console.log('App installed event:', event);
  // Clear the deferred prompt
  self.deferredPrompt = null;
});

// Enhanced error handling for better offline resilience
self.addEventListener('error', (event) => {
  console.log('SW: Error event:', event);
});

// Enhanced unhandled rejection handling
self.addEventListener('unhandledrejection', (event) => {
  console.log('SW: Unhandled rejection:', event);
});
