'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@btc-wallet/ui';
import jsQR from 'jsqr';
import { Camera, AlertTriangle } from 'lucide-react';
import styles from './QRScannerModal.module.css';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScanResult,
}: QRScannerModalProps) {
  const [error, setError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitializedRef = useRef(false);

  const cleanupCamera = useCallback(() => {
    // Clear scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    // Stop camera stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Reset flags
    hasInitializedRef.current = false;
    setIsInitializing(false);
    setIsScanning(false);
  }, []);

  const startQRScanning = useCallback(() => {
    // Clear any existing interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setIsScanning(true);
    // Only log in development (check if we're in browser and not in production)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('QR scanning started - waiting for QR code...');
    }

    // Real QR code scanning
    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          // Set canvas size to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame to canvas for processing
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get image data for QR detection
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

          // Use jsQR to detect QR codes
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            // Only log in development (check if we're in browser and not in production)
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('QR Scanner - QR code detected:', code.data);
              console.log(
                'QR Scanner - QR code data length:',
                code.data.length
              );
              console.log('QR Scanner - QR code data type:', typeof code.data);
              console.log('QR Scanner - Full QR data:', code.data);
              console.log(
                'QR Scanner - First 100 chars:',
                code.data.substring(0, 100)
              );
              console.log(
                'QR Scanner - Last 100 chars:',
                code.data.substring(Math.max(0, code.data.length - 100))
              );
            }

            // Clean the data (remove spaces, newlines, etc.)
            const cleanData = code.data.trim().replace(/[\s\n\r\t]/g, '');
            // Only log in development (check if we're in browser and not in production)
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('QR Scanner - Cleaned data:', cleanData);
              console.log(
                'QR Scanner - Cleaned data length:',
                cleanData.length
              );
            }

            // Try to parse as JSON to see if it's valid JSON
            try {
              const jsonData = JSON.parse(cleanData);
              // Only log in development (check if we're in browser and not in production)
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.log('QR Scanner - JSON parse successful:', jsonData);
              }
            } catch {
              // Only log in development (check if we're in browser and not in production)
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.log(
                  'QR Scanner - Not valid JSON, trying to parse as string'
                );
                console.log('QR Scanner - Raw string data:', cleanData);
              }
            }

            onScanResult(cleanData);
            cleanupCamera();
            onClose();
          }
        }
      }
    }, 100); // Scan every 100ms
  }, [onScanResult, onClose, cleanupCamera]);

  const initializeCamera = useCallback(async () => {
    if (isInitializing || hasInitializedRef.current) return;

    setIsInitializing(true);
    setError('');

    try {
      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Requesting camera access...');
      }

      // iOS Safari specific handling
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('iOS detected:', isIOS);
      }

      let constraints;
      if (isIOS) {
        // iOS Safari works better with minimal constraints
        constraints = {
          video: {
            facingMode: 'environment', // Back camera
          },
        };
      } else {
        // Other browsers can use more specific constraints
        constraints = {
          video: {
            facingMode: 'environment', // Use back camera
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
      }

      // Try to get camera stream with fallback
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('First attempt failed, trying fallback...');
        }
        // Fallback: try with any available camera
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
      }

      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Camera stream obtained:', stream);
      }
      streamRef.current = stream;

      // Wait for the video element to be available
      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Waiting for video element...');
        console.log('videoRef.current:', videoRef.current);
        console.log('Modal isOpen:', isOpen);
      }

      // Use a more reliable approach to wait for the video element
      await new Promise((resolve) => {
        const checkVideoElement = () => {
          if (videoRef.current) {
            // Only log in development (check if we're in browser and not in production)
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('Video element found!');
            }
            resolve(true);
          } else {
            // Only log in development (check if we're in browser and not in production)
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('Video element not found, retrying...');
            }
            requestAnimationFrame(checkVideoElement);
          }
        };

        checkVideoElement();

        // Fallback timeout after 2 seconds
        setTimeout(() => {
          if (!videoRef.current) {
            // Only log in development (check if we're in browser and not in production)
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.error('Video element timeout after 2 seconds');
            }
            resolve(false);
          }
        }, 2000);
      });

      if (videoRef.current) {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video element found, setting up...');
          console.log('Setting video source...');
        }
        videoRef.current.srcObject = stream;

        // iOS Safari needs these attributes
        if (isIOS) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
        }

        // Wait for video to be ready with better error handling
        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            const video = videoRef.current;

            const onLoadedMetadata = () => {
              // Only log in development (check if we're in browser and not in production)
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.log('Video metadata loaded:', {
                  videoWidth: video.videoWidth,
                  videoHeight: video.videoHeight,
                  readyState: video.readyState,
                });
              }
              video.play().then(resolve).catch(reject);
            };

            const onError = (error: string | Event) => {
              // Only log in development (check if we're in browser and not in production)
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.error('Video error:', error);
              }
              reject(new Error('Video failed to load'));
            };

            video.onloadedmetadata = onLoadedMetadata;
            video.onerror = onError;

            // Fallback timeout
            setTimeout(() => {
              if (video.readyState < 2) {
                reject(new Error('Video timeout'));
              }
            }, 5000);
          } else {
            reject(new Error('Video element not found'));
          }
        });

        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video started successfully');
        }

        // Add debugging to check video state
        if (videoRef.current) {
          // Only log in development (check if we're in browser and not in production)
          if (
            typeof window !== 'undefined' &&
            window.location.hostname === 'localhost'
          ) {
            console.log('Video element state after setup:', {
              videoWidth: videoRef.current.videoWidth,
              videoHeight: videoRef.current.videoHeight,
              readyState: videoRef.current.readyState,
              paused: videoRef.current.paused,
              ended: videoRef.current.ended,
              currentTime: videoRef.current.currentTime,
              duration: videoRef.current.duration,
              srcObject: !!videoRef.current.srcObject,
            });
          }
        }
      } else {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.error('Video element not available after waiting');
          console.log('Current state:', {
            isOpen,
            isInitializing,
            hasInitialized: hasInitializedRef.current,
            videoRef: videoRef.current,
          });
        }
        throw new Error('Video element not available');
      }

      // Start QR scanning
      startQRScanning();
      setIsInitializing(false);
      hasInitializedRef.current = true;
    } catch (err) {
      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.error('Camera access error:', err);
      }

      // Provide helpful error messages for common issues
      let errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage =
            'Camera access denied. Please allow camera access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage =
            'No camera found. Please check your device has a camera.';
        } else if (err.name === 'NotSupportedError') {
          errorMessage =
            'Camera not supported. Please try a different browser.';
        }
      }

      setError(`Camera error: ${errorMessage}`);
      setIsInitializing(false);
      hasInitializedRef.current = false;
    }
  }, [isInitializing, startQRScanning, isOpen]);

  // Initialize camera when modal opens
  useEffect(() => {
    // Only log in development (check if we're in browser and not in production)
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('useEffect triggered:', {
        isOpen,
        hasInitialized: hasInitializedRef.current,
      });
    }

    if (isOpen && !hasInitializedRef.current && !isInitializing) {
      // Only log in development (check if we're in browser and not in production)
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Modal is open, starting camera initialization...');
      }
      // Add a small delay to ensure the modal is fully rendered
      const timer = setTimeout(() => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Timer fired, calling initializeCamera...');
        }
        initializeCamera();
      }, 100); // Reduced delay since video element is always rendered

      return () => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Clearing timer...');
        }
        clearTimeout(timer);
      };
    }

    // Cleanup function - only run when component unmounts or modal closes
    return () => {
      if (!isOpen) {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Modal closed, cleaning up camera...');
        }
        cleanupCamera();
      }
    };
  }, [isOpen, initializeCamera, cleanupCamera, isInitializing]);

  // Monitor video element state
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      const handleLoadedMetadata = () => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video loaded metadata:', {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          });
        }
      };

      const handleCanPlay = () => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video can play');
        }
      };

      const handlePlaying = () => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video is playing');
        }
      };

      const handleError = (e: Event) => {
        // Only log in development (check if we're in browser and not in production)
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.error('Video error event:', e);
        }
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('playing', handlePlaying);
      video.addEventListener('error', handleError);

      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('error', handleError);
      };
    }
  }, []);

  const handleClose = () => {
    cleanupCamera();
    onClose();
  };

  const handleRetry = () => {
    cleanupCamera();
    setError('');
    setIsInitializing(false);
    hasInitializedRef.current = false;
    initializeCamera();
  };

  if (!isOpen) return null;

  // Only log in development (check if we're in browser and not in production)
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    console.log('QRScannerModal rendering:', {
      isOpen,
      isInitializing,
      error,
      hasInitialized: hasInitializedRef.current,
      videoRef: videoRef.current,
    });
  }

  return (
    <div className={styles.scannerOverlay}>
      <div className={styles.scannerContainer}>
        <div className={styles.scannerHeader}>
          <h2 className={styles.scannerTitle}>
            <Camera size={20} strokeWidth={2.5} />
            Scan Signature QR Code
          </h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        <div className={styles.scannerContent}>
          {error ? (
            <div className={styles.errorContainer}>
              <AlertTriangle size={16} strokeWidth={2.5} />
              <p className={styles.errorText}>{error}</p>
              <Button
                onClick={handleRetry}
                variant="primary"
                icon="fas fa-camera"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <>
              {/* Always render video element but control visibility */}
              <div
                className={styles.videoContainer}
                style={{
                  display: isInitializing ? 'none' : 'flex',
                  opacity: isInitializing ? 0 : 1,
                }}
              >
                <video
                  ref={videoRef}
                  className={styles.video}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    backgroundColor: 'black',
                  }}
                />
                <canvas ref={canvasRef} className={styles.canvas} />

                {/* Scanning overlay */}
                <div className={styles.scanOverlay}>
                  <div className={styles.scanFrame}>
                    <div className={styles.scanCorner}></div>
                    <div className={styles.scanCorner}></div>
                    <div className={styles.scanCorner}></div>
                    <div className={styles.scanCorner}></div>
                  </div>
                  <p className={styles.scanText}>
                    {isScanning
                      ? 'Scanning for QR code...'
                      : 'Position the QR code within the frame'}
                  </p>
                </div>
              </div>

              {/* Loading overlay when initializing */}
              {isInitializing && (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p className={styles.loadingText}>Initializing camera...</p>
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.scannerFooter}>
          <Button onClick={handleClose} variant="secondary" icon="fas fa-times">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
