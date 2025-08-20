'use client';

import { useMemo, useState } from 'react';
import {
  Header,
  MainContainer,
  Card,
  Button,
  Input,
  TextArea,
  Status,
  QRScannerModal,
} from '@btc-wallet/ui';
import { OfflineIndicator, InstallPrompt } from '@btc-wallet/my-pwa';
import { QRCodeDisplay } from '../components/QRCode';
import { ExportPasswordModal } from './components/ExportPasswordModal';
import {
  Entropy,
  BIP39,
  Wallet,
  WalletExport,
} from '@btc-wallet/wallet-generator';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

type AddressKind = 'p2pkh' | 'p2sh-p2wpkh' | 'p2wpkh';
type NetworkOption = 'mainnet' | 'testnet';

interface GeneratedWalletUI {
  mnemonic: string;
  network: NetworkOption;
  kind: AddressKind;
  path: string;
  xpub: string;
  wif: string;
  publicKeyHex: string;
  address: string;
  privateKeyHex?: string;
}

const ECPair = ECPairFactory(ecc);

export default function WalletPage() {
  const [network, setNetwork] = useState<NetworkOption>('testnet');
  const [addressKind, setAddressKind] = useState<AddressKind | ''>('');
  const [mnemonic, setMnemonic] = useState<string>('');
  const [passphrase, setPassphrase] = useState<string>('');
  const [wallet, setWallet] = useState<GeneratedWalletUI | null>(null);
  const [status, setStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning';
  } | null>(null);
  const [revealed, setRevealed] = useState<{ mnemonic: boolean; wif: boolean }>(
    { mnemonic: false, wif: false }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedEntropyHex, setScannedEntropyHex] = useState<string>('');
  const [networkConfirmed, setNetworkConfirmed] = useState<boolean>(false);
  const [isPasswordPromptOpen, setIsPasswordPromptOpen] = useState<
    false | { mode: 'wallet-json' | 'wif-only' }
  >(false);
  const [exportPassword, setExportPassword] = useState('');
  const [isCombiningEntropy, setIsCombiningEntropy] = useState(false);
  const [diagnostics, setDiagnostics] = useState<string>('');

  function handleReset() {
    setNetwork('testnet');
    setAddressKind('');
    setMnemonic('');
    setPassphrase('');
    setWallet(null);
    setStatus(null);
    setRevealed({ mnemonic: false, wif: false });
    setShowQRScanner(false);
    setScannedEntropyHex('');
    setNetworkConfirmed(false);
    setIsPasswordPromptOpen(false);
    setExportPassword('');
    setIsCombiningEntropy(false);
  }

  const coinType = useMemo(
    () => (network === 'mainnet' ? 0 : 1) as 0 | 1,
    [network]
  );

  const handleGenerate = async () => {
    if (!mnemonic || !addressKind) return;
    try {
      setIsGenerating(true);
      setStatus({ message: 'Deriving wallet...', type: 'warning' });
      const assembled = await Wallet.assembleWalletFromMnemonic({
        mnemonic,
        passphrase,
        kind: addressKind as AddressKind,
        coinType,
      });
      const privHex = (() => {
        try {
          const pair = ECPair.fromWIF(assembled.wif);
          return pair.privateKey
            ? Buffer.from(pair.privateKey).toString('hex')
            : undefined;
        } catch {
          return undefined;
        }
      })();
      setWallet({
        mnemonic,
        network,
        kind: addressKind as AddressKind,
        path: assembled.path,
        xpub: assembled.xpub,
        wif: assembled.wif,
        publicKeyHex: assembled.publicKeyHex,
        address: assembled.address,
        privateKeyHex: privHex,
      });
      setStatus({ message: 'Wallet derived successfully', type: 'success' });
      setRevealed({ mnemonic: false, wif: false });
    } catch (e) {
      setStatus({
        message: e instanceof Error ? e.message : 'Failed to derive wallet',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return new Uint8Array(digest);
  }

  function hammingDistance(a: Uint8Array, b: Uint8Array): number {
    if (a.length !== b.length) return NaN;
    let dist = 0;
    for (let i = 0; i < a.length; i += 1) {
      let x = a[i] ^ b[i];
      // count bits set in byte x
      x = x - ((x >>> 1) & 0x55);
      x = (x & 0x33) + ((x >>> 2) & 0x33);
      dist += (((x + (x >>> 4)) & 0x0f) * 0x01) & 0xff;
    }
    return dist;
  }

  async function captureCameraNoiseBytes(
    stream?: MediaStream
  ): Promise<{ bytes: Uint8Array; stream: MediaStream | null }> {
    let localStream: MediaStream | null = null;
    const useStream =
      stream ??
      (await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      }));
    localStream = stream ? null : useStream;

    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true as any;
    video.srcObject = useStream;

    await new Promise<void>((resolve, reject) => {
      const onLoaded = () => resolve();
      const onError = () => reject(new Error('Video failed to load'));
      video.onloadedmetadata = onLoaded;
      video.onerror = onError as any;
      setTimeout(() => resolve(), 1000);
    });
    // Ensure playing
    try {
      await video.play();
    } catch {}

    const width = Math.max(160, Math.min(320, video.videoWidth || 320));
    const height = Math.max(120, Math.min(240, video.videoHeight || 240));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const chunks: Uint8Array[] = [];
    const frames = 3;
    for (let i = 0; i < frames; i += 1) {
      await new Promise((r) => setTimeout(r, 120));
      if (!ctx) break;
      ctx.drawImage(video, 0, 0, width, height);
      const img = ctx.getImageData(0, 0, width, height);
      // Sample every 32nd byte to limit size
      const sample: number[] = [];
      for (let j = 0; j < img.data.length; j += 32) sample.push(img.data[j]);
      chunks.push(new Uint8Array(sample));
    }

    // Cleanup if we created the stream
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    video.srcObject = null;

    // Hash the concatenated camera samples
    const totalLen = chunks.reduce((n, a) => n + a.length, 0);
    const all = new Uint8Array(totalLen);
    let o = 0;
    for (const c of chunks) {
      all.set(c, o);
      o += c.length;
    }
    const camHash = await sha256(all);
    return { bytes: camHash, stream: stream ?? useStream };
  }

  async function captureMicNoiseBytes(
    stream?: MediaStream
  ): Promise<Uint8Array> {
    const useStream =
      stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
    const audioCtx = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(useStream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const buffer = new Uint8Array(analyser.fftSize);
    const samples: Uint8Array[] = [];
    const iterations = 16;
    for (let i = 0; i < iterations; i += 1) {
      await new Promise((r) => setTimeout(r, 60));
      analyser.getByteTimeDomainData(buffer);
      // Copy snapshot
      samples.push(new Uint8Array(buffer));
    }
    // Cleanup only if we created the stream
    if (!stream) {
      useStream.getTracks().forEach((t) => t.stop());
    }
    source.disconnect();
    analyser.disconnect();
    audioCtx.close();

    const totalLen = samples.reduce((n, a) => n + a.length, 0);
    const all = new Uint8Array(totalLen);
    let o = 0;
    for (const s of samples) {
      all.set(s, o);
      o += s.length;
    }
    const micHash = await sha256(all);
    return micHash;
  }

  async function combineEntropySources() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Media devices not available');
    }
    // Request combined stream for both video and audio for fewer prompts
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true,
    });
    try {
      const cam = await captureCameraNoiseBytes(stream);
      const mic = await captureMicNoiseBytes(stream);
      // OS CSPRNG (256 bits => 32 bytes)
      const os = Entropy.generateEntropy(256);
      // Mix: SHA-256 over concatenation
      const totalLen = cam.bytes.length + mic.length + os.length;
      const all = new Uint8Array(totalLen);
      all.set(cam.bytes, 0);
      all.set(mic, cam.bytes.length);
      all.set(os, cam.bytes.length + mic.length);
      const combined = await sha256(all);
      // Return 32 bytes
      return combined;
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  async function runEntropyDiagnostics() {
    setDiagnostics('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus({ message: 'Media devices not available', type: 'error' });
      return;
    }
    const iterations = 16;
    setStatus({ message: 'Running entropy diagnostics…', type: 'warning' });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' },
      audio: true,
    });
    try {
      const camDigests: Uint8Array[] = [];
      const micDigests: Uint8Array[] = [];
      const combinedDigests: Uint8Array[] = [];
      for (let i = 0; i < iterations; i += 1) {
        const cam = await captureCameraNoiseBytes(stream);
        const mic = await captureMicNoiseBytes(stream);
        const os = Entropy.generateEntropy(256);
        const totalLen = cam.bytes.length + mic.length + os.length;
        const all = new Uint8Array(totalLen);
        all.set(cam.bytes, 0);
        all.set(mic, cam.bytes.length);
        all.set(os, cam.bytes.length + mic.length);
        const combined = await sha256(all);
        camDigests.push(cam.bytes);
        micDigests.push(mic);
        combinedDigests.push(combined);
      }

      function summarize(label: string, arr: Uint8Array[]) {
        const seen = new Set<string>();
        let ones = 0;
        for (const d of arr) {
          seen.add(
            Array.from(d)
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('')
          );
          for (const b of d) {
            // popcount per byte
            let x = b;
            x = x - ((x >>> 1) & 0x55);
            x = (x & 0x33) + ((x >>> 2) & 0x33);
            ones += (((x + (x >>> 4)) & 0x0f) * 0x01) & 0xff;
          }
        }
        const uniq = seen.size;
        const totalBits = arr.length * arr[0].length * 8;
        const ratio = totalBits ? ones / totalBits : 0;
        let minHam = 256;
        let sumHam = 0;
        let pairs = 0;
        for (let i = 1; i < arr.length; i += 1) {
          const h = hammingDistance(arr[i - 1], arr[i]);
          if (!Number.isNaN(h)) {
            minHam = Math.min(minHam, h);
            sumHam += h;
            pairs += 1;
          }
        }
        const avgHam = pairs ? sumHam / pairs : 0;
        return `${label}: unique=${uniq}/${
          arr.length
        }, minHamAdj=${minHam}, avgHamAdj=${avgHam.toFixed(
          1
        )}, onesRatio=${ratio.toFixed(3)}`;
      }

      const combinedValidationFailures = combinedDigests.filter(
        (d) => !Entropy.validateEntropy(d, { allowedBits: [256] }).isValid
      ).length;

      const lines = [
        summarize('Camera digests', camDigests),
        summarize('Mic digests', micDigests),
        summarize('Combined digests', combinedDigests),
        `Combined validation failures: ${combinedValidationFailures}`,
        'Heuristics expectations: unique should equal iterations, minHamAdj > 80, onesRatio ~ 0.5',
      ];
      setDiagnostics(lines.join('\n'));
      setStatus({ message: 'Diagnostics complete', type: 'success' });
    } catch (e) {
      setStatus({
        message: e instanceof Error ? e.message : 'Diagnostics failed',
        type: 'error',
      });
    } finally {
      stream.getTracks().forEach((t) => t.stop());
    }
  }

  const parseEntropyHex = (raw: string): string | null => {
    try {
      const maybeJson = JSON.parse(raw);
      if (maybeJson && typeof maybeJson === 'object') {
        const v = (maybeJson.entropyHex || maybeJson.entropy || '').toString();
        if (typeof v === 'string') return v.trim();
      }
    } catch {}
    const trimmed = raw.trim();
    const match = trimmed.match(/[0-9a-fA-F]+/g);
    if (!match) return null;
    const joined = match.join('');
    const candidates = [64, 56, 48, 40, 32];
    for (const len of candidates) {
      if (joined.length === len) return joined;
    }
    for (const len of candidates) {
      if (joined.length > len) return joined.slice(0, len);
    }
    return null;
  };

  const handleScanEntropy = async (result: string) => {
    setShowQRScanner(false);
    const hex = parseEntropyHex(result);
    if (!hex) {
      setStatus({ message: 'No valid entropy hex found in QR', type: 'error' });
      return;
    }
    const cleanHex = hex.toLowerCase();
    const isHex = /^[0-9a-f]+$/.test(cleanHex);
    if (!isHex) {
      setStatus({ message: 'Entropy is not valid hex', type: 'error' });
      return;
    }
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes[i / 2] = parseInt(cleanHex.slice(i, i + 2), 16);
    }
    const validation = Entropy.validateEntropy(bytes, {
      allowedBits: [128, 160, 192, 224, 256],
      requireNonZero: true,
      requireNonOnes: true,
      detectShortCycles: true,
      maxCycleLength: 8,
      detectMonotonic: true,
      disallowHalfRepeat: true,
    });
    if (!validation.isValid) {
      setStatus({ message: `Entropy validation failed`, type: 'error' });
      return;
    }
    setScannedEntropyHex(cleanHex);
    try {
      const m = BIP39.entropyToMnemonic(bytes);
      setMnemonic(m);
      setStatus({
        message: `Entropy scanned. Choose address type then Generate.`,
        type: 'success',
      });
    } catch (e) {
      setStatus({
        message:
          e instanceof Error ? e.message : 'Failed to use scanned entropy',
        type: 'error',
      });
    }
  };

  const handleAssembleFromMnemonic = async () => {
    try {
      if (!BIP39.isValidMnemonic(mnemonic)) {
        setStatus({ message: 'Invalid mnemonic', type: 'error' });
        return;
      }
      if (!addressKind) {
        setStatus({ message: 'Select an address type', type: 'error' });
        return;
      }
      setIsGenerating(true);
      const assembled = await Wallet.assembleWalletFromMnemonic({
        mnemonic,
        passphrase,
        kind: addressKind as AddressKind,
        coinType,
      });
      const privHex = (() => {
        try {
          const pair = ECPair.fromWIF(assembled.wif);
          return pair.privateKey
            ? Buffer.from(pair.privateKey).toString('hex')
            : undefined;
        } catch {
          return undefined;
        }
      })();
      setWallet({
        mnemonic,
        network,
        kind: addressKind as AddressKind,
        path: assembled.path,
        xpub: assembled.xpub,
        wif: assembled.wif,
        publicKeyHex: assembled.publicKeyHex,
        address: assembled.address,
        privateKeyHex: privHex,
      });
      setStatus({ message: 'Wallet derived from mnemonic', type: 'success' });
    } catch (e) {
      setStatus({
        message:
          e instanceof Error ? e.message : 'Failed to derive from mnemonic',
        type: 'error',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setStatus({ message: `${label} copied to clipboard`, type: 'success' });
    } catch {
      setStatus({ message: `Failed to copy ${label}`, type: 'error' });
    }
  };

  const handleExport = (format: 'json' | 'txt') => {
    if (!wallet) return;
    const fileName = `wallet-${wallet.network}-${wallet.kind}.` + format;
    const data =
      format === 'json'
        ? WalletExport.exportWalletAsJson(wallet)
        : WalletExport.exportWalletAsText(wallet);
    const blob = new Blob([data], {
      type: format === 'json' ? 'application/json' : 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    setStatus({
      message: `Exported ${format.toUpperCase()} file`,
      type: 'success',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  async function onExportEncrypted(mode: 'wallet-json' | 'wif-only') {
    if (!wallet) return;
    setIsPasswordPromptOpen({ mode });
  }

  async function performExportEncrypted() {
    if (!wallet || !isPasswordPromptOpen) return;
    const password = exportPassword.trim();
    if (!password) {
      setStatus({ message: 'Password is required', type: 'error' });
      return;
    }
    try {
      let filename = '';
      let b64: string;
      if (isPasswordPromptOpen.mode === 'wallet-json') {
        const enc = await WalletExport.encryptWallet(wallet, password);
        b64 = WalletExport.serializeEncryptedExportToBase64(enc);
        filename = `wallet-${wallet.network}-${wallet.kind}.enc`;
      } else {
        const enc = await WalletExport.encryptText(wallet.wif, password);
        b64 = WalletExport.serializeEncryptedExportToBase64(enc);
        filename = `wif-${wallet.network}-${wallet.kind}.enc`;
      }
      const blob = new Blob([b64], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      setStatus({ message: 'Encrypted export saved', type: 'success' });
    } catch (e) {
      setStatus({
        message: e instanceof Error ? e.message : 'Export failed',
        type: 'error',
      });
    } finally {
      setIsPasswordPromptOpen(false);
      setExportPassword('');
    }
  }

  return (
    <MainContainer>
      <OfflineIndicator />
      <Header appType="signer" network={network} />

      {!wallet && (
        <Card
          title="Step 1 · Entropy"
          icon="fas fa-camera"
          footer={
            <>
              <Button
                variant="primary"
                icon="fas fa-sync-alt"
                onClick={() => {
                  (async () => {
                    try {
                      setIsCombiningEntropy(true);
                      setStatus({
                        message: 'Collecting camera and microphone noise...',
                        type: 'warning',
                      });
                      const combined = await combineEntropySources();
                      const valid = Entropy.validateEntropy(combined, {
                        allowedBits: [256],
                        requireNonZero: true,
                        requireNonOnes: true,
                        detectShortCycles: true,
                        maxCycleLength: 8,
                        detectMonotonic: true,
                        disallowHalfRepeat: true,
                      });
                      if (!valid.isValid) {
                        setStatus({
                          message: 'Combined entropy failed validation',
                          type: 'error',
                        });
                        return;
                      }
                      const hex = Array.from(combined)
                        .map((b) => b.toString(16).padStart(2, '0'))
                        .join('');
                      setScannedEntropyHex(hex);
                      const m = BIP39.entropyToMnemonic(combined);
                      setMnemonic(m);
                      setAddressKind('');
                      setNetworkConfirmed(false);
                      setStatus({
                        message:
                          'Combined entropy ready. Choose Network (Step 2), then Address Type (Step 3).',
                        type: 'success',
                      });
                    } catch (e) {
                      setStatus({
                        message:
                          e instanceof Error
                            ? e.message
                            : 'Failed to combine entropy',
                        type: 'error',
                      });
                    } finally {
                      setIsCombiningEntropy(false);
                    }
                  })();
                }}
              >
                Combine Entropy (Cam+Mic+OS)
              </Button>
              <Button
                variant="secondary"
                icon="fas fa-shield-alt"
                onClick={() => {
                  (async () => {
                    await runEntropyDiagnostics();
                  })();
                }}
              >
                Run Security Diagnostics
              </Button>
              <Button
                variant="secondary"
                icon="fas fa-camera"
                onClick={() => setShowQRScanner(true)}
              >
                Scan Entropy QR
              </Button>
              <Button
                variant="ghost"
                icon="fas fa-bolt"
                onClick={() => {
                  const e = Entropy.generateEntropy(256);
                  const valid = Entropy.validateEntropy(e, {
                    allowedBits: [256],
                    requireNonZero: true,
                    requireNonOnes: true,
                    detectShortCycles: true,
                    maxCycleLength: 8,
                    detectMonotonic: true,
                    disallowHalfRepeat: true,
                  });
                  if (!valid.isValid) {
                    setStatus({
                      message: 'Local entropy failed validation',
                      type: 'error',
                    });
                    return;
                  }
                  const hex = Array.from(e)
                    .map((b) => b.toString(16).padStart(2, '0'))
                    .join('');
                  setScannedEntropyHex(hex);
                  const m = BIP39.entropyToMnemonic(e);
                  setMnemonic(m);
                  setAddressKind('');
                  setNetworkConfirmed(false);
                  setStatus({
                    message:
                      'Local entropy generated. Choose Network (Step 2), then Address Type (Step 3).',
                    type: 'success',
                  });
                }}
              >
                Generate Local Entropy
              </Button>
              {scannedEntropyHex && (
                <Button
                  variant="secondary"
                  icon="fas fa-copy"
                  onClick={() => handleCopy(scannedEntropyHex, 'Entropy Hex')}
                >
                  Copy Entropy Hex
                </Button>
              )}
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {scannedEntropyHex && (
              <Input
                label="Entropy (hex)"
                value={scannedEntropyHex}
                readOnly
                helperText="Generated locally and validated. Keep this private."
              />
            )}
            {diagnostics && (
              <TextArea
                label="Diagnostics"
                value={diagnostics}
                readOnly
                rows={4}
                helperText="Heuristics summary of recent runs."
              />
            )}
          </div>
        </Card>
      )}

      {!wallet && scannedEntropyHex && (
        <Card
          title="Step 2 · Network"
          icon="fas fa-signal"
          footer={
            <>
              <Button
                variant={network === 'mainnet' ? 'primary' : 'secondary'}
                onClick={() => setNetwork('mainnet')}
              >
                Mainnet
              </Button>
              <Button
                variant={network === 'testnet' ? 'primary' : 'secondary'}
                onClick={() => setNetwork('testnet')}
              >
                Testnet
              </Button>
              <Button
                variant="secondary"
                icon="fas fa-check"
                onClick={() => setNetworkConfirmed(true)}
                disabled={!scannedEntropyHex}
              >
                Confirm Network
              </Button>
            </>
          }
        >
          <div className="text-gray-300 text-sm">
            Choose the network to derive your keys for.
          </div>
        </Card>
      )}

      {!wallet && scannedEntropyHex && networkConfirmed && (
        <Card
          title="Step 3 · Address Type"
          icon="fas fa-layer-group"
          footer={
            <>
              <Button
                variant={addressKind === 'p2pkh' ? 'primary' : 'secondary'}
                onClick={() => setAddressKind('p2pkh')}
              >
                Legacy (P2PKH)
              </Button>
              <Button
                variant={
                  addressKind === 'p2sh-p2wpkh' ? 'primary' : 'secondary'
                }
                onClick={() => setAddressKind('p2sh-p2wpkh')}
              >
                Nested SegWit (P2SH-P2WPKH)
              </Button>
              <Button
                variant={addressKind === 'p2wpkh' ? 'primary' : 'secondary'}
                onClick={() => setAddressKind('p2wpkh')}
              >
                Native SegWit (P2WPKH)
              </Button>
            </>
          }
        >
          <div className="text-gray-300 text-sm">
            Pick the address type. Native SegWit is recommended.
          </div>
        </Card>
      )}

      {!wallet && addressKind && networkConfirmed && (
        <Card
          title="Step 4 · Mnemonic"
          icon="fas fa-magic"
          footer={
            <>
              <Button
                onClick={handleGenerate}
                loading={isGenerating}
                icon="fas fa-bolt"
                disabled={!mnemonic || !addressKind}
              >
                Generate
              </Button>
              <Button
                onClick={handlePrint}
                variant="ghost"
                icon="fas fa-print"
                disabled={!wallet}
              >
                Print
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-6">
            <TextArea
              label="Mnemonic"
              placeholder="Scan entropy first; mnemonic will populate here"
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              rows={3}
              helperText="Write this down securely. Never share it."
            />
            <Input
              label="Passphrase (optional)"
              placeholder="BIP39 passphrase (leave empty if none)"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
              helperText="Enhances security if you set one. Memorize it."
            />
          </div>
        </Card>
      )}

      {wallet && (
        <Card
          title="Wallet Details"
          icon="fas fa-wallet"
          footer={
            <>
              <Button
                variant="secondary"
                icon="fas fa-file-export"
                onClick={() => onExportEncrypted('wallet-json')}
              >
                Export Encrypted (Full Wallet)
              </Button>
              <Button
                variant="secondary"
                icon="fas fa-key"
                onClick={() => onExportEncrypted('wif-only')}
                disabled={!revealed.wif}
              >
                Export Encrypted WIF Only
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input label="Network" value={wallet.network} readOnly />
              </div>
              <div>
                <Input label="Address Type" value={wallet.kind} readOnly />
              </div>
              <div className="md:col-span-2">
                <Input label="Derivation Path" value={wallet.path} readOnly />
              </div>
              <div className="md:col-span-2">
                <Input label="Address" value={wallet.address} readOnly />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    icon="fas fa-copy"
                    onClick={() => handleCopy(wallet.address, 'Address')}
                  >
                    Copy Address
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Input label="XPUB" value={wallet.xpub} readOnly />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    icon="fas fa-copy"
                    onClick={() => handleCopy(wallet.xpub, 'XPUB')}
                  >
                    Copy XPUB
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Public Key (hex)"
                  value={wallet.publicKeyHex}
                  readOnly
                />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    icon="fas fa-copy"
                    onClick={() =>
                      handleCopy(wallet.publicKeyHex, 'Public Key')
                    }
                  >
                    Copy Public Key
                  </Button>
                </div>
              </div>
              <div className="md:col-span-2">
                <TextArea
                  label="Mnemonic (hidden by default)"
                  value={
                    revealed.mnemonic
                      ? wallet.mnemonic
                      : '•••• •••• •••• •••• •••• ••••'
                  }
                  readOnly
                  rows={2}
                />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setRevealed((r) => ({ ...r, mnemonic: !r.mnemonic }))
                    }
                    icon={revealed.mnemonic ? 'fas fa-eye-slash' : 'fas fa-eye'}
                  >
                    {revealed.mnemonic ? 'Hide' : 'Reveal'} Mnemonic
                  </Button>
                  {revealed.mnemonic && (
                    <Button
                      variant="secondary"
                      icon="fas fa-copy"
                      onClick={() => handleCopy(wallet.mnemonic, 'Mnemonic')}
                    >
                      Copy Mnemonic
                    </Button>
                  )}
                </div>
              </div>
              <div className="md:col-span-2">
                <Input
                  label="Private Key (WIF) — hidden by default"
                  value={
                    revealed.wif
                      ? wallet.wif
                      : '•••••••••••••••••••••••••••••••••••••'
                  }
                  readOnly
                />
                <div className="button-row">
                  <Button
                    variant="secondary"
                    onClick={() => setRevealed((r) => ({ ...r, wif: !r.wif }))}
                    icon={revealed.wif ? 'fas fa-eye-slash' : 'fas fa-eye'}
                  >
                    {revealed.wif ? 'Hide' : 'Reveal'} WIF
                  </Button>
                  {revealed.wif && (
                    <Button
                      variant="secondary"
                      icon="fas fa-copy"
                      onClick={() => handleCopy(wallet.wif, 'WIF')}
                    >
                      Copy WIF
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <Card title="Address QR" icon="fas fa-qrcode">
                <QRCodeDisplay
                  data={wallet.address}
                  size={200}
                  className="mx-auto"
                />
              </Card>
              <Card title="Public Key QR" icon="fas fa-qrcode">
                <QRCodeDisplay
                  data={wallet.publicKeyHex}
                  size={200}
                  className="mx-auto"
                />
              </Card>
              <Card title="Private Key (hex) QR" icon="fas fa-qrcode">
                {revealed.wif && wallet.privateKeyHex ? (
                  <QRCodeDisplay
                    data={wallet.privateKeyHex}
                    size={200}
                    className="mx-auto"
                  />
                ) : (
                  <div className="text-center text-gray-400 text-sm">
                    Reveal WIF to display private key QR
                  </div>
                )}
              </Card>
            </div>
          </div>
        </Card>
      )}

      {wallet && (
        <Card
          title="All set"
          icon="fas fa-check-circle"
          footer={
            <Button variant="danger" icon="fas fa-redo" onClick={handleReset}>
              Reset
            </Button>
          }
        >
          <div className="text-gray-300 text-sm">
            You can reset to start a new wallet flow.
          </div>
        </Card>
      )}

      <div className="footer">
        <p>All generation happens locally in your browser and works offline.</p>
        <p>Never share your mnemonic or private key. Store securely offline.</p>
      </div>

      {status && (
        <Status
          message={status.message}
          type={status.type}
          onDismiss={() => setStatus(null)}
        />
      )}

      <ExportPasswordModal
        isOpen={!!isPasswordPromptOpen}
        mode={
          (isPasswordPromptOpen && isPasswordPromptOpen.mode) || 'wallet-json'
        }
        password={exportPassword}
        onPasswordChange={setExportPassword}
        onCancel={() => setIsPasswordPromptOpen(false)}
        onConfirm={performExportEncrypted}
      />

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScanResult={handleScanEntropy}
      />

      <InstallPrompt />
    </MainContainer>
  );
}
