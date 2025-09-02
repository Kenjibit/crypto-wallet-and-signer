'use client';

import { useState, useCallback, useEffect } from 'react';
import { Button, Status } from '@btc-wallet/ui';
import {
  Camera,
  Shield,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import { Entropy, BIP39 } from '@btc-wallet/wallet-generator';
import { createLTCWallet } from '../libs/ltc-wallet';
import { QRScannerModal } from '@btc-wallet/ui';
import { useAuth } from '../contexts/AuthContext';
import { useWalletDatabase } from '../hooks/useWalletDatabase';
import {
  ModalBase,
  ModalStep,
  ModalStepHeader,
  OptionSelector,
} from './modals';
import type { OptionItem } from './modals';

interface WalletCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (wallet: GeneratedWallet) => void;
}

interface GeneratedWallet {
  id?: number;
  name: string;
  address: string;
  publicKey: string;
  encryptedPrivateKey: string;
  mnemonic: string; // Keep mnemonic for display purposes only
  derivationPath: string;
  network: 'mainnet' | 'testnet';
  cryptoType: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastSync?: Date;
}

export function WalletCreationModal({
  isOpen,
  onClose,
  onCreateSuccess,
}: WalletCreationModalProps) {
  const [step, setStep] = useState<'entropy' | 'name-input' | 'review'>(
    'entropy'
  );
  const [entropySource, setEntropySource] = useState<
    'external' | 'combined' | 'local'
  >('combined');
  const [isGenerating, setIsGenerating] = useState(false);
  const [walletName, setWalletName] = useState('');
  const [passphrase] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [generatedWallet, setGeneratedWallet] =
    useState<GeneratedWallet | null>(null);
  const [entropyProgress, setEntropyProgress] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const { authState } = useAuth();
  const { createWallet, databaseStatus } = useWalletDatabase();

  // Debug database status
  console.log('🔍 WalletCreationModal - Database Status:', {
    isInitialized: databaseStatus.status.isInitialized,
    error: databaseStatus.status.error,
    isOpen: databaseStatus.status.isOpen,
    version: databaseStatus.status.version,
    timestamp: new Date().toISOString(),
  });

  // Fallback: Force database initialization if it's taking too long
  useEffect(() => {
    if (!databaseStatus.status.isInitialized && !databaseStatus.status.error) {
      const timer = setTimeout(async () => {
        console.log('🔄 Force initializing database after timeout...');
        try {
          await databaseStatus.initialize();
          console.log('✅ Database force initialization completed');
        } catch (error) {
          console.error('❌ Database force initialization failed:', error);
        }
      }, 3000); // Wait 3 seconds before forcing initialization

      return () => clearTimeout(timer);
    }
  }, [
    databaseStatus.status.isInitialized,
    databaseStatus.status.error,
    databaseStatus.initialize,
    databaseStatus,
  ]);

  // Define entropy source options using our OptionItem interface
  const entropyOptions: OptionItem[] = [
    {
      id: 'external',
      title: 'External Entropy',
      description: 'Scan QR code with external entropy',
      icon: <Camera size={24} />,
    },
    {
      id: 'combined',
      title: 'Combined (Recommended)',
      description: 'Camera + Microphone + OS',
      icon: <Shield size={24} />,
    },
    {
      id: 'local',
      title: 'Local Only',
      description: 'OS random number generator',
      icon: <Shield size={24} />,
    },
  ];

  const createWalletFromEntropy = useCallback(
    async (entropyData: Uint8Array) => {
      try {
        // Generate mnemonic
        setStatus('Generating mnemonic from entropy...');
        const mnemonic = BIP39.entropyToMnemonic(entropyData);

        // Create wallet
        setStatus('Creating LTC wallet...');
        const wallet = await createLTCWallet(
          mnemonic,
          passphrase || '',
          'p2wpkh', // Native SegWit for LTC
          'mainnet', // Litecoin mainnet
          { account: 0, change: 0, index: 0 }
        );

        // Generate a default wallet name for fallback only
        const defaultName = `LTC Wallet ${new Date().toLocaleDateString()}`;
        // Start with empty input field
        setWalletName('');

        const ltcWallet: GeneratedWallet = {
          name: defaultName,
          address: wallet.address,
          publicKey: wallet.publicKeyHex || '',
          encryptedPrivateKey: wallet.wif, // This will be encrypted later
          mnemonic: mnemonic, // For display purposes only
          derivationPath: "m/84'/2'/0'/0/0", // BIP84 for LTC
          network: 'mainnet',
          cryptoType: 'LTC',
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
        };

        setGeneratedWallet(ltcWallet);
        setStatus('Wallet created successfully! Enter a name for your wallet.');
        setStep('name-input');
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : 'Failed to create wallet. Please try again.';
        setError(errorMessage);
        setStatus('');
      } finally {
        setIsGenerating(false);
        setEntropyProgress(0);
      }
    },
    [passphrase]
  );

  const generateEntropyFromExternal = useCallback(() => {
    // Open QR scanner modal
    setShowQRScanner(true);
    // setPendingExternalEntropy(true); // This line was removed
  }, []);

  const handleQRCodeScanned = useCallback(
    async (qrData: string) => {
      try {
        setShowQRScanner(false);
        setStatus('Processing scanned entropy...');

        // Validate that the QR data contains valid entropy
        let entropyData: Uint8Array;

        try {
          // Try to parse as hex string first
          if (qrData.match(/^[0-9a-fA-F]+$/)) {
            // Convert hex string to bytes
            entropyData = new Uint8Array(
              qrData.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
            );
          } else {
            // Try to parse as base64
            entropyData = new Uint8Array(
              atob(qrData)
                .split('')
                .map((char) => char.charCodeAt(0))
            );
          }
        } catch {
          throw new Error(
            'Invalid entropy format in QR code. Expected hex string or base64.'
          );
        }

        // Validate entropy length (should be 32 bytes for 256-bit entropy)
        if (entropyData.length !== 32) {
          throw new Error(
            `Invalid entropy length. Expected 32 bytes, got ${entropyData.length} bytes.`
          );
        }

        // Validate entropy quality using the entropy validation function
        const validation = Entropy.validateEntropy(entropyData);
        if (!validation.isValid) {
          throw new Error(
            `Entropy validation failed: ${validation.errors.join(', ')}`
          );
        }

        // setScannedEntropy(qrData); // This line was removed
        // setPendingExternalEntropy(false); // This line was removed

        // Now proceed with wallet creation using the validated entropy
        await createWalletFromEntropy(entropyData);
      } catch (error: unknown) {
        setShowQRScanner(false);
        // setPendingExternalEntropy(false); // This line was removed
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error occurred';
        setError(`QR Code Error: ${errorMessage}`);
      }
    },
    [createWalletFromEntropy]
  );

  const handleQRScannerClose = useCallback(() => {
    setShowQRScanner(false);
    // setPendingExternalEntropy(false); // This line was removed
    setError('QR code scanning cancelled.');
  }, []);

  const generateEntropyFromCamera =
    useCallback(async (): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const video = document.createElement('video');

        canvas.width = 640;
        canvas.height = 480;

        navigator.mediaDevices
          .getUserMedia({ video: true })
          .then((stream) => {
            video.srcObject = stream;
            video.play();

            let frameCount = 0;
            const maxFrames = 30;
            const entropyData: number[] = [];

            const captureFrame = () => {
              if (frameCount >= maxFrames) {
                stream.getTracks().forEach((track) => track.stop());
                resolve(new Uint8Array(entropyData));
                return;
              }

              ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx?.getImageData(
                0,
                0,
                canvas.width,
                canvas.height
              );

              if (imageData) {
                // Extract entropy from image data
                for (let i = 0; i < imageData.data.length; i += 4) {
                  const r = imageData.data[i];
                  const g = imageData.data[i + 1];
                  const b = imageData.data[i + 2];
                  const a = imageData.data[i + 3];

                  // Combine RGBA values and add to entropy
                  const combined =
                    ((r << 24) | (g << 16) | (b << 8) | a) & 0xff;
                  entropyData.push(combined);

                  if (entropyData.length >= 32) break;
                }
              }

              frameCount++;
              requestAnimationFrame(captureFrame);
            };

            video.addEventListener('loadeddata', () => {
              captureFrame();
            });
          })
          .catch((error) => {
            reject(new Error(`Camera access failed: ${error.message}`));
          });
      });
    }, []);

  const generateEntropyFromMicrophone =
    useCallback(async (): Promise<Uint8Array> => {
      return new Promise((resolve, reject) => {
        navigator.mediaDevices
          .getUserMedia({ audio: true })
          .then((stream) => {
            const audioContext = new (window.AudioContext ||
              (
                window as typeof window & {
                  webkitAudioContext?: typeof AudioContext;
                }
              ).webkitAudioContext)();
            const analyser = audioContext.createAnalyser();
            const microphone = audioContext.createMediaStreamSource(stream);
            const scriptProcessor = audioContext.createScriptProcessor(
              2048,
              1,
              1
            );

            microphone.connect(analyser);
            analyser.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);

            const entropyData: number[] = [];
            let sampleCount = 0;
            const maxSamples = 100;

            scriptProcessor.onaudioprocess = (event) => {
              if (sampleCount >= maxSamples) {
                stream.getTracks().forEach((track) => track.stop());
                audioContext.close();
                resolve(new Uint8Array(entropyData.slice(0, 32)));
                return;
              }

              const inputBuffer = event.inputBuffer;
              const inputData = inputBuffer.getChannelData(0);

              // Extract entropy from audio data
              for (let i = 0; i < inputData.length; i++) {
                const sample = Math.abs(inputData[i]);
                const entropy = Math.floor(sample * 255);
                entropyData.push(entropy);

                if (entropyData.length >= 32) break;
              }

              sampleCount++;
            };
          })
          .catch((error) => {
            reject(new Error(`Microphone access failed: ${error.message}`));
          });
      });
    }, []);

  const handleGenerateEntropy = useCallback(async () => {
    try {
      setIsGenerating(true);
      setError('');
      setEntropyProgress(0);

      let entropyData: Uint8Array;

      switch (entropySource) {
        case 'external':
          generateEntropyFromExternal();
          return;

        case 'combined':
          setStatus('Capturing camera frames...');
          setEntropyProgress(20);
          const cameraEntropy = await generateEntropyFromCamera();
          setEntropyProgress(40);

          setStatus('Capturing microphone audio...');
          const micEntropy = await generateEntropyFromMicrophone();
          setEntropyProgress(60);

          setStatus('Combining entropy sources...');
          entropyData = new Uint8Array(32);
          for (let i = 0; i < 32; i++) {
            entropyData[i] =
              cameraEntropy[i] ^
              micEntropy[i] ^
              crypto.getRandomValues(new Uint8Array(1))[0];
          }
          setEntropyProgress(80);
          break;

        case 'local':
          setStatus('Generating local entropy...');
          entropyData = crypto.getRandomValues(new Uint8Array(32));
          setEntropyProgress(100);
          break;

        default:
          throw new Error('Invalid entropy source');
      }

      // Generate mnemonic
      setStatus('Generating mnemonic from entropy...');
      const mnemonic = BIP39.entropyToMnemonic(entropyData);

      // Create wallet
      setStatus('Creating LTC wallet...');
      const wallet = await createLTCWallet(
        mnemonic,
        passphrase || '',
        'p2wpkh', // Native SegWit for LTC
        'mainnet', // Litecoin mainnet
        { account: 0, change: 0, index: 0 }
      );

      // Generate a default wallet name for fallback only
      const defaultName = `LTC Wallet ${new Date().toLocaleDateString()}`;
      // Start with empty input field
      setWalletName('');

      const ltcWallet: GeneratedWallet = {
        name: defaultName,
        address: wallet.address,
        publicKey: wallet.publicKeyHex || '',
        encryptedPrivateKey: wallet.wif, // This will be encrypted later
        mnemonic: mnemonic, // For display purposes only
        derivationPath: "m/84'/2'/0'/0/0", // BIP84 for LTC
        network: 'mainnet',
        cryptoType: 'LTC',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      setGeneratedWallet(ltcWallet);
      setStatus('Wallet created successfully! Enter a name for your wallet.');
      setStep('name-input');
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to create wallet. Please try again.';
      setError(errorMessage);
      setStatus('');
    } finally {
      setIsGenerating(false);
      setEntropyProgress(0);
    }
  }, [
    entropySource,
    passphrase,
    generateEntropyFromCamera,
    generateEntropyFromExternal,
    generateEntropyFromMicrophone,
  ]);

  const handleBack = useCallback(() => {
    if (step === 'name-input') {
      setStep('entropy');
    } else if (step === 'review') {
      // Go back to main screen instead of previous step
      onClose();
    } else {
      setStep('entropy');
    }
  }, [step, onClose]);

  const handleNameSubmit = useCallback(async () => {
    if (!generatedWallet) return;

    // Check if database is initialized
    if (!databaseStatus.status.isInitialized) {
      setError(
        'Database is not ready yet. Please wait a moment and try again.'
      );
      return;
    }

    if (databaseStatus.status.error) {
      setError(`Database error: ${databaseStatus.status.error}`);
      return;
    }

    try {
      setStatus('Saving wallet to database...');

      // Update the wallet name (use default if empty)
      const finalName =
        walletName.trim() || `LTC Wallet ${new Date().toLocaleDateString()}`;

      // Update the generated wallet with the final name
      const walletWithName = { ...generatedWallet, name: finalName };
      setGeneratedWallet(walletWithName);

      // Create wallet data for database
      const walletData = {
        name: finalName,
        address: walletWithName.address,
        publicKey: walletWithName.publicKey,
        encryptedPrivateKey: walletWithName.encryptedPrivateKey,
        derivationPath: walletWithName.derivationPath,
        network: walletWithName.network,
        cryptoType: walletWithName.cryptoType,
        isActive: true,
      };

      // Save to database
      const savedWallet = await createWallet(
        walletData,
        authState.method || 'pin',
        authState.method === 'passkey' ? new ArrayBuffer(0) : '0000' // Placeholder for PIN
      );

      setStatus('Wallet saved successfully!');

      // Update the generated wallet with the database ID
      const walletWithId = { ...walletWithName, id: savedWallet.id };
      setGeneratedWallet(walletWithId);

      // Go to review step instead of closing
      setStep('review');
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setError(`Failed to save wallet: ${errorMessage}. Please try again.`);
      setStatus('');
    }
  }, [
    walletName,
    generatedWallet,
    createWallet,
    authState.method,
    databaseStatus,
  ]);

  const handleScanToSign = useCallback(() => {
    if (generatedWallet) {
      onCreateSuccess(generatedWallet);
      onClose();
    }
  }, [generatedWallet, onCreateSuccess, onClose]);

  if (!isOpen) return null;

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      title="Create LTC Wallet"
      className="wallet-creation-modal"
      showBackButton={true}
      onBack={step === 'entropy' ? onClose : handleBack}
    >
      {step === 'entropy' && (
        <ModalStep>
          <ModalStepHeader
            title="Choose Entropy Source"
            description="Select how to generate random entropy for your wallet. Combined sources provide the highest security."
          />

          <OptionSelector
            options={entropyOptions}
            selectedId={entropySource}
            onSelect={(source) =>
              setEntropySource(source as 'external' | 'combined' | 'local')
            }
            variant="grid"
          />

          <div className="entropy-generation">
            <button
              onClick={handleGenerateEntropy}
              className="generate-button"
              disabled={isGenerating}
            >
              <ArrowRight size={24} className="icon-left" />
              <div className="button-content">
                <h4>Create Wallet</h4>
                <p>Create your secure Litecoin wallet</p>
              </div>
              <ArrowLeft size={20} className="icon-right" />
            </button>

            {isGenerating && (
              <div className="generation-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${entropyProgress}%` }}
                  ></div>
                </div>
                <p className="progress-text">{status}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="creation-error">
              <Status message={error} type="error" />
            </div>
          )}
        </ModalStep>
      )}

      {step === 'name-input' && generatedWallet && (
        <ModalStep variant="narrow">
          <ModalStepHeader
            title="Name Your Wallet"
            description="Give your wallet a memorable name to help you identify it later"
          />

          <div className="name-input-container">
            <div className="input-group">
              <label htmlFor="wallet-name" className="input-label">
                Wallet Name
              </label>
              <input
                id="wallet-name"
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Enter a name for your wallet"
                className="name-input-field"
                autoFocus
              />
              <p className="input-helper">
                Leave empty to use the default name: {generatedWallet.name}
              </p>
            </div>

            <div className="name-actions">
              <Button
                onClick={handleNameSubmit}
                variant="primary"
                className="name-submit-btn"
                disabled={isGenerating || !databaseStatus.status.isInitialized}
              >
                {!databaseStatus.status.isInitialized
                  ? 'Initializing Database...'
                  : 'Continue'}
              </Button>
            </div>
          </div>
        </ModalStep>
      )}

      {step === 'review' && generatedWallet && (
        <ModalStep>
          <div className="wallet-summary">
            <h3>Wallet Created Successfully!</h3>

            <div className="wallet-info-summary">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{generatedWallet.name}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Crypto Type:</span>
                <span className="info-value">{generatedWallet.cryptoType}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Network:</span>
                <span className="info-value">{generatedWallet.network}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Created:</span>
                <span className="info-value">
                  {generatedWallet.createdAt.toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="mnemonic-section">
              <div className="section-header">
                <h4>Your Recovery Phrase</h4>
                <button
                  onClick={() => setShowMnemonic(!showMnemonic)}
                  className="toggle-button"
                >
                  {showMnemonic ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showMnemonic ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className="mnemonic-display">
                {showMnemonic ? (
                  <div className="mnemonic-words">
                    {generatedWallet.mnemonic.split(' ').map((word, index) => (
                      <span key={index} className="word">
                        {index + 1}. {word}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mnemonic-hidden">
                    •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• •••• ••••
                  </div>
                )}
              </div>

              <p className="mnemonic-warning">
                <AlertCircle size={16} />
                Write down these 24 words and store them securely offline. Never
                share them with anyone.
              </p>
            </div>

            <div className="address-section">
              <h4>Your Litecoin Address</h4>
              <div className="address-display">
                <code>{generatedWallet.address}</code>
                <button
                  onClick={() =>
                    navigator.clipboard.writeText(generatedWallet.address)
                  }
                  className="copy-button"
                >
                  Copy
                </button>
              </div>
            </div>

            {passphrase && (
              <div className="passphrase-section">
                <h4>Passphrase</h4>
                <p>You&apos;ve set a passphrase for additional security.</p>
              </div>
            )}
          </div>

          <div className="review-actions-single">
            <Button
              onClick={handleScanToSign}
              variant="primary"
              className="scan-to-sign-button"
            >
              Scan to Sign
            </Button>
          </div>
        </ModalStep>
      )}

      {/* QR Scanner Modal for External Entropy */}
      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={handleQRScannerClose}
          onScanResult={handleQRCodeScanned}
        />
      )}
    </ModalBase>
  );
}
