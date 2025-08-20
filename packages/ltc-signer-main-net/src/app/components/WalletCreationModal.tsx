'use client';

import { useState, useCallback } from 'react';
import { Card, Button, Input, TextArea, Status } from '@btc-wallet/ui';
import { Plus, Camera, Mic, Shield, Eye, EyeOff, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { Entropy, BIP39, WalletExport } from '@btc-wallet/wallet-generator';
import { createLTCWallet } from '../libs/ltc-wallet';
import { QRScannerModal } from '@btc-wallet/ui';



interface WalletCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateSuccess: (wallet: any) => void;
}

interface GeneratedWallet {
  mnemonic: string;
  passphrase: string;
  address: string;
  network: 'mainnet';
  entropySource: string;
  created: boolean;
  wif: string;
  xpub: string;
}

export function WalletCreationModal({ isOpen, onClose, onCreateSuccess }: WalletCreationModalProps) {

  const [step, setStep] = useState<'entropy' | 'review' | 'confirm'>('entropy');
  const [entropySource, setEntropySource] = useState<'external' | 'combined' | 'local'>('combined');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMnemonic, setGeneratedMnemonic] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [entropyProgress, setEntropyProgress] = useState(0);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedEntropy, setScannedEntropy] = useState<string>('');
  const [pendingExternalEntropy, setPendingExternalEntropy] = useState<boolean>(false);
  



  const createWalletFromEntropy = useCallback(async (entropyData: Uint8Array) => {
    try {
      setIsGenerating(true);
      setError('');
      setEntropyProgress(0);
      
      // Generate mnemonic
      setStatus('Generating mnemonic from entropy...');
      const mnemonic = BIP39.entropyToMnemonic(entropyData);
      setGeneratedMnemonic(mnemonic);
      
      // Create wallet
      setStatus('Creating LTC wallet...');
      const wallet = await createLTCWallet(
        mnemonic,
        passphrase || '',
        'p2wpkh', // Native SegWit for LTC
        'mainnet', // Litecoin mainnet
        { account: 0, change: 0, index: 0 }
      );

      const ltcWallet: GeneratedWallet = {
        mnemonic,
        passphrase: passphrase || '',
        address: wallet.address,
        network: 'mainnet',
        entropySource: 'external',
        created: true,
        wif: wallet.wif,
        xpub: wallet.xpub
      };

      setGeneratedWallet(ltcWallet);
      setStatus('Wallet created successfully! Review your details.');
      setStep('review');
      
    } catch (err: any) {
      setError(err.message || 'Failed to create wallet. Please try again.');
      setStatus('');
    } finally {
      setIsGenerating(false);
      setEntropyProgress(0);
    }
  }, [passphrase]);

  const generateEntropyFromExternal = useCallback(() => {
    // Open QR scanner modal
    setShowQRScanner(true);
    setPendingExternalEntropy(true);
  }, []);

  const handleQRCodeScanned = useCallback(async (qrData: string) => {
    try {
      setShowQRScanner(false);
      setStatus('Processing scanned entropy...');
      
      // Validate that the QR data contains valid entropy
      let entropyData: Uint8Array;
      
      try {
        // Try to parse as hex string first
        if (qrData.match(/^[0-9a-fA-F]+$/)) {
          // Convert hex string to bytes
          entropyData = new Uint8Array(qrData.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []);
        } else {
          // Try to parse as base64
          entropyData = new Uint8Array(atob(qrData).split('').map(char => char.charCodeAt(0)));
        }
      } catch (parseError) {
        throw new Error('Invalid entropy format in QR code. Expected hex string or base64.');
      }
      
      // Validate entropy length (should be 32 bytes for 256-bit entropy)
      if (entropyData.length !== 32) {
        throw new Error(`Invalid entropy length. Expected 32 bytes, got ${entropyData.length} bytes.`);
      }
      
      // Validate entropy quality using the entropy validation function
      const validation = Entropy.validateEntropy(entropyData);
      if (!validation.isValid) {
        throw new Error(`Entropy validation failed: ${validation.errors.join(', ')}`);
      }
      
      setScannedEntropy(qrData);
      setPendingExternalEntropy(false);
      
      // Now proceed with wallet creation using the validated entropy
      await createWalletFromEntropy(entropyData);
      
    } catch (error: any) {
      setShowQRScanner(false);
      setPendingExternalEntropy(false);
      setError(`QR Code Error: ${error.message}`);
    }
  }, [createWalletFromEntropy]);

  const handleQRScannerClose = useCallback(() => {
    setShowQRScanner(false);
    setPendingExternalEntropy(false);
    setError('QR code scanning cancelled.');
  }, []);

  const generateEntropyFromCamera = useCallback(async (): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.createElement('video');
      
      canvas.width = 640;
      canvas.height = 480;
      
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          video.srcObject = stream;
          video.play();
          
          let frameCount = 0;
          const maxFrames = 30;
          const entropyParts: Uint8Array[] = [];
          
          const captureFrame = () => {
            if (frameCount >= maxFrames) {
              stream.getTracks().forEach(track => track.stop());
              const mixedEntropy = Entropy.mixEntropyParts(entropyParts);
              resolve(mixedEntropy);
              return;
            }
            
            ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
            
            if (imageData) {
              // Extract entropy from image data (pixel variations)
              const data = imageData.data;
              const entropy = new Uint8Array(32);
              for (let i = 0; i < 32; i++) {
                entropy[i] = data[i * 4] ^ data[i * 4 + 1] ^ data[i * 4 + 2];
              }
              entropyParts.push(entropy);
            }
            
            frameCount++;
            setEntropyProgress((frameCount / maxFrames) * 100);
            requestAnimationFrame(captureFrame);
          };
          
          video.addEventListener('loadeddata', captureFrame);
        })
        .catch(reject);
    });
  }, []);

  const generateEntropyFromMicrophone = useCallback(async (): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          let sampleCount = 0;
          const maxSamples = 100;
          const entropyParts: Uint8Array[] = [];
          
          const captureAudio = () => {
            if (sampleCount >= maxSamples) {
              stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
              audioContext.close();
              const mixedEntropy = Entropy.mixEntropyParts(entropyParts);
              resolve(mixedEntropy);
              return;
            }
            
            analyser.getByteFrequencyData(dataArray);
            const entropy = new Uint8Array(32);
            for (let i = 0; i < 32; i++) {
              entropy[i] = dataArray[i] ^ dataArray[i + 32] ^ dataArray[i + 64] ^ dataArray[i + 96];
            }
            entropyParts.push(entropy);
            
            sampleCount++;
            setEntropyProgress((sampleCount / maxSamples) * 100);
            requestAnimationFrame(captureAudio);
          };
          
          captureAudio();
        })
        .catch(reject);
    });
  }, []);

  const handleGenerateEntropy = async () => {
    try {
      setIsGenerating(true);
      setError('');
      setEntropyProgress(0);
      
      let entropyData: Uint8Array;
      
      switch (entropySource) {
        case 'external':
          setStatus('Opening QR scanner for external entropy...');
          generateEntropyFromExternal();
          return; // Exit early for external entropy
        case 'combined':
          setStatus('Combining multiple entropy sources...');
          const cameraEntropy = await generateEntropyFromCamera();
          const micEntropy = await generateEntropyFromMicrophone();
          const osEntropy = Entropy.generateEntropy(256);
          entropyData = await Entropy.mixEntropyParts([cameraEntropy, micEntropy, osEntropy]);
          break;
        case 'local':
          setStatus('Generating local entropy...');
          entropyData = Entropy.generateEntropy(256);
          break;
        default:
          throw new Error('Invalid entropy source');
      }

      // Only proceed with wallet creation for non-external sources
      // Validate entropy
      const validation = Entropy.validateEntropy(entropyData);
      if (!validation.isValid) {
        throw new Error(`Entropy validation failed: ${validation.errors.join(', ')}`);
      }

      // Generate mnemonic
      setStatus('Generating mnemonic from entropy...');
      const mnemonic = BIP39.entropyToMnemonic(entropyData);
      setGeneratedMnemonic(mnemonic);
      
      // Create wallet
      setStatus('Creating LTC wallet...');
      const wallet = await createLTCWallet(
        mnemonic,
        passphrase || '',
        'p2wpkh', // Native SegWit for LTC
        'mainnet', // Litecoin mainnet
        { account: 0, change: 0, index: 0 }
      );

      const ltcWallet: GeneratedWallet = {
        mnemonic,
        passphrase: passphrase || '',
        address: wallet.address,
        network: 'mainnet',
        entropySource: entropySource,
        created: true,
        wif: wallet.wif,
        xpub: wallet.xpub
      };

      setGeneratedWallet(ltcWallet);
      setStatus('Wallet created successfully! Review your details.');
      setStep('review');
      
    } catch (err: any) {
      setError(err.message || 'Failed to generate entropy. Please try again.');
      setStatus('');
    } finally {
      setIsGenerating(false);
      setEntropyProgress(0);
    }
  };

  const handleConfirmWallet = () => {
    if (generatedWallet) {
      onCreateSuccess(generatedWallet);
    }
  };

  const handleReset = () => {
    setStep('entropy');
    setGeneratedMnemonic('');
    setPassphrase('');
    setError('');
    setStatus('');
    setGeneratedWallet(null);
    setEntropyProgress(0);
  };

  const handleBack = () => {
    console.log('Back button clicked, current step:', step);
    if (step === 'review') {
      setStep('entropy');
    } else if (step === 'confirm') {
      setStep('review');
    }
  };

  const handleAddAndSave = async () => {
    if (!generatedWallet) return;
    
    // User is already authenticated to reach this screen, no need for additional verification
    try {
      // Use standard password "123456" as requested
      const password = "123456";
      
      // Encrypt the WIF using the same encryption as btc-signer
      const encrypted = await WalletExport.encryptText(generatedWallet.wif, password);
      const b64 = WalletExport.serializeEncryptedExportToBase64(encrypted);
      
      // Create filename using wallet address
      const filename = `${generatedWallet.address}.enc`;
      
      // Create and download the encrypted file
      const blob = new Blob([b64], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      // Proceed to confirm step
      setStep('confirm');
    } catch (error) {
      console.error('Failed to export encrypted file:', error);
      setError('Failed to export encrypted file. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="wallet-creation-modal">
      <div className="modal-header">
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Button clicked!');
            if (step !== 'entropy') {
              handleBack();
            } else {
              onClose();
            }
          }} 
          className="back-button"
          type="button"
        >
          <ArrowLeft size={20} />
        </button>
        <h2>Create LTC Wallet</h2>
      </div>

      <div className="modal-content">
        {step === 'entropy' && (
          <div className="entropy-step">
            <div className="entropy-source-selector">
              <h3>Choose Entropy Source</h3>
              <p className="description">
                Select how to generate random entropy for your wallet. 
                Combined sources provide the highest security.
              </p>
              
              <div className="source-options">
                <button
                  className={`source-option ${entropySource === 'external' ? 'selected' : ''}`}
                  onClick={() => setEntropySource('external')}
                >
                  <Camera size={24} className="icon-left" />
                  <div className="option-content">
                    <h4>External Entropy</h4>
                    <p>Scan QR code with external entropy</p>
                  </div>
                  <CheckCircle size={20} className="icon-right" />
                </button>

                <button
                  className={`source-option ${entropySource === 'combined' ? 'selected' : ''}`}
                  onClick={() => setEntropySource('combined')}
                >
                  <Shield size={24} className="icon-left" />
                  <div className="option-content">
                    <h4>Combined (Recommended)</h4>
                    <p>Camera + Microphone + OS</p>
                  </div>
                  <CheckCircle size={20} className="icon-right" />
                </button>

                <button
                  className={`source-option ${entropySource === 'local' ? 'selected' : ''}`}
                  onClick={() => setEntropySource('local')}
                >
                  <Shield size={24} className="icon-left" />
                  <div className="option-content">
                    <h4>Local Only</h4>
                    <p>OS random number generator</p>
                  </div>
                  <CheckCircle size={20} className="icon-right" />
                </button>
              </div>
            </div>

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
          </div>
        )}

        {step === 'review' && generatedWallet && (
          <div className="review-step">
            <div className="wallet-summary">
              <h3>Wallet Created Successfully!</h3>
              


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
                  Write down these 24 words and store them securely offline. 
                  Never share them with anyone.
                </p>
              </div>

              <div className="address-section">
                <h4>Your Litecoin Address</h4>
                <div className="address-display">
                  <code>{generatedWallet.address}</code>
                  <button 
                    onClick={() => navigator.clipboard.writeText(generatedWallet.address)}
                    className="copy-button"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {passphrase && (
                <div className="passphrase-section">
                  <h4>Passphrase</h4>
                  <p>You've set a passphrase for additional security.</p>
                </div>
              )}
            </div>

            <div className="review-actions-single">
              <Button onClick={handleAddAndSave} variant="primary" className="add-save-button">
                Add & Save
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && generatedWallet && (
          <div className="confirm-step">
            <div className="confirmation-content">
              <CheckCircle size={64} className="success-icon" />
              <h3>Wallet Ready!</h3>
              <p>Your Litecoin wallet has been created successfully.</p>
              
              <div className="final-actions">
                <Button onClick={handleConfirmWallet} variant="primary" className="confirm-button">
                  <Plus size={20} />
                  Use This Wallet
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* QR Scanner Modal for External Entropy */}
      {showQRScanner && (
        <QRScannerModal
          isOpen={showQRScanner}
          onClose={handleQRScannerClose}
          onScanResult={handleQRCodeScanned}
        />
      )}


    </div>
  );
}