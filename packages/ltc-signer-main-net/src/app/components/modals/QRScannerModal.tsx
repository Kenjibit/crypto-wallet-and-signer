'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import { Camera, AlertTriangle } from 'lucide-react';
import { Button } from '@btc-wallet/ui';

import styles from './QRScannerModal.module.css';

export interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
  title?: string;
  scanType?: 'signature' | 'psbt' | 'general';
}

export function QRScannerModal({
  isOpen,
  onClose,
  onScanResult,
  title,
  scanType = 'general',
}: QRScannerModalProps) {
  // Set default title based on scan type
  const defaultTitle =
    title ||
    (scanType === 'signature'
      ? 'Scan Signature QR Code'
      : scanType === 'psbt'
      ? 'Scan PSBT QR Code'
      : 'Scan QR Code');
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
            const cleanData = code.data.trim().replace(/[\s\n\r\t]/g, '');
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
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      await new Promise((resolve) => {
        const checkVideoElement = () => {
          if (videoRef.current) {
            resolve(true);
          } else {
            requestAnimationFrame(checkVideoElement);
          }
        };
        checkVideoElement();
        setTimeout(() => {
          if (!videoRef.current) {
            resolve(false);
          }
        }, 2000);
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        if (isIOS) {
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.setAttribute('webkit-playsinline', 'true');
        }

        await new Promise((resolve, reject) => {
          if (videoRef.current) {
            const video = videoRef.current;
            const onLoadedMetadata = () => {
              video.play().then(resolve).catch(reject);
            };
            const onError = () => {
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
      } else {
        throw new Error('Video element not available');
      }

      startQRScanning();
      setIsInitializing(false);
      hasInitializedRef.current = true;
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof Error) {
        const domError = err as DOMException;
        if (domError.name === 'NotAllowedError') {
          errorMessage =
            'Camera access denied. Please allow camera access and try again.';
        } else if (domError.name === 'NotFoundError') {
          errorMessage =
            'No camera found. Please check your device has a camera.';
        } else if (domError.name === 'NotSupportedError') {
          errorMessage =
            'Camera not supported. Please try a different browser.';
        }
      }

      setError(`Camera error: ${errorMessage}`);
      setIsInitializing(false);
      hasInitializedRef.current = false;
    }
  }, [isInitializing, startQRScanning]);

  useEffect(() => {
    if (isOpen && !hasInitializedRef.current && !isInitializing) {
      const timer = setTimeout(() => {
        initializeCamera();
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }

    return () => {
      if (!isOpen) {
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

  return (
    <div className={styles.scannerOverlay}>
      <div className={styles.scannerContainer}>
        {/* Header */}
        <div className={styles.scannerHeader}>
          <h2 className={styles.scannerTitle}>
            <Camera size={20} strokeWidth={2.5} />
            {defaultTitle}
          </h2>
          <button onClick={handleClose} className={styles.closeButton}>
            ×
          </button>
        </div>

        {/* Full Screen Content */}
        <div className={styles.scannerContent}>
          {error ? (
            <div className={styles.errorContainer}>
              <AlertTriangle size={48} strokeWidth={2.5} />
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
              {/* Full Screen Video */}
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
                />
                <canvas ref={canvasRef} className={styles.canvas} />

                {/* Scan Overlay */}
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

              {/* Loading State */}
              {isInitializing && (
                <div className={styles.loadingContainer}>
                  <div className={styles.loadingSpinner}></div>
                  <p className={styles.loadingText}>Initializing camera...</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={styles.scannerFooter}>
          <Button onClick={handleClose} variant="secondary" icon="fas fa-times">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// Dedicated PSBT Scanner Modal - behaves exactly like signature scanner
export interface PSBTScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
  title?: string;
}

export function PSBTScannerModal({
  isOpen,
  onClose,
  onScanResult,
  title,
}: PSBTScannerModalProps) {
  return (
    <QRScannerModal
      isOpen={isOpen}
      onClose={onClose}
      onScanResult={onScanResult}
      title={title}
      scanType="psbt"
    />
  );
}
