'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertTriangle } from 'lucide-react';
import { Button } from '../Button';
import styles from './QRScannerModal.module.css';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
  title?: string;
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScanResult,
  title = 'Scan Signature QR Code',
}: QRScannerModalProps) {
  const [error, setError] = useState<string>('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasInitializedRef = useRef(false);

  const cleanupCamera = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current as unknown as number);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    hasInitializedRef.current = false;
    setIsInitializing(false);
    setIsScanning(false);
  }, []);

  const startQRScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current as unknown as number);
    }
    setIsScanning(true);
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('QR scanning started - waiting for QR code...');
    }

    scanIntervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('QR Scanner - QR code detected:', code.data);
              console.log(
                'QR Scanner - QR code data length:',
                code.data.length
              );
            }

            const cleanData = code.data.trim().replace(/[\s\n\r\t]/g, '');
            try {
              JSON.parse(cleanData);
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.log('QR Scanner - JSON parse successful');
              }
            } catch {}

            onScanResult(cleanData);
            cleanupCamera();
            onClose();
          }
        }
      }
    }, 100);
  }, [onScanResult, onClose, cleanupCamera]);

  const initializeCamera = useCallback(async () => {
    if (isInitializing || hasInitializedRef.current) return;

    setIsInitializing(true);
    setError('');

    try {
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Requesting camera access...');
      }

      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

      let constraints: MediaStreamConstraints;
      if (isIOS) {
        constraints = {
          video: {
            facingMode: 'environment',
          },
        };
      } else {
        constraints = {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('First attempt failed, trying fallback...');
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Camera stream obtained:', stream);
      }
      streamRef.current = stream;

      await new Promise((resolve) => {
        const checkVideoElement = () => {
          if (videoRef.current) {
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              console.log('Video element found!');
            }
            resolve(true);
          } else {
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
        setTimeout(() => {
          if (!videoRef.current) {
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
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video element found, setting up...');
        }
        videoRef.current.srcObject = stream;

        if (isIOS) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
        }

        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            const video = videoRef.current;
            const onLoadedMetadata = () => {
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
            setTimeout(() => {
              if (video.readyState < 2) {
                reject(new Error('Video timeout'));
              }
            }, 5000);
          } else {
            reject(new Error('Video element not found'));
          }
        });

        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Video started successfully');
        }
      } else {
        throw new Error('Video element not available');
      }

      startQRScanning();
      setIsInitializing(false);
      hasInitializedRef.current = true;
    } catch (err) {
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.error('Camera access error:', err);
      }
      let errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof Error) {
        if ((err as any).name === 'NotAllowedError') {
          errorMessage =
            'Camera access denied. Please allow camera access and try again.';
        } else if ((err as any).name === 'NotFoundError') {
          errorMessage =
            'No camera found. Please check your device has a camera.';
        } else if ((err as any).name === 'NotSupportedError') {
          errorMessage =
            'Camera not supported. Please try a different browser.';
        }
      }

      setError(`Camera error: ${errorMessage}`);
      setIsInitializing(false);
      hasInitializedRef.current = false;
    }
  }, [isInitializing, startQRScanning, isOpen]);

  useEffect(() => {
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
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log('Modal is open, starting camera initialization...');
      }
      const timer = setTimeout(() => {
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Timer fired, calling initializeCamera...');
        }
        initializeCamera();
      }, 100);

      return () => {
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.log('Clearing timer...');
        }
        clearTimeout(timer);
      };
    }

    return () => {
      if (!isOpen) {
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
          <Camera size={20} strokeWidth={2.5} className={styles.cameraIcon} />
          <h2 className={styles.scannerTitle}>{title}</h2>
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
