'use client';

import { Entropy } from '@btc-wallet/wallet-generator';

export async function hashSha256(
  data: Uint8Array | Uint8Array[]
): Promise<Uint8Array> {
  const bytes = Array.isArray(data) ? concat(data) : data;
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

export async function captureCameraNoiseBytes(
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
  video.playsInline = true;
  video.srcObject = useStream;

  await new Promise<void>((resolve, reject) => {
    const onLoaded = () => resolve();
    const onError = () => reject(new Error('Video failed to load'));
    video.onloadedmetadata = onLoaded;
    video.onerror = onError;
    setTimeout(() => resolve(), 1000);
  });
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
    const sample: number[] = [];
    for (let j = 0; j < img.data.length; j += 32) sample.push(img.data[j]);
    chunks.push(new Uint8Array(sample));
  }

  if (localStream) {
    localStream.getTracks().forEach((t) => t.stop());
  }
  video.srcObject = null;

  const camHash = await hashSha256(concat(chunks));
  return { bytes: camHash, stream: stream ?? useStream };
}

export async function captureMicNoiseBytes(
  stream?: MediaStream
): Promise<Uint8Array> {
  const useStream =
    stream ?? (await navigator.mediaDevices.getUserMedia({ audio: true }));
  const audioCtx = new (window.AudioContext ||
    (window as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext)();
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
    samples.push(new Uint8Array(buffer));
  }
  if (!stream) {
    useStream.getTracks().forEach((t) => t.stop());
  }
  source.disconnect();
  analyser.disconnect();
  audioCtx.close();

  const micHash = await hashSha256(concat(samples));
  return micHash;
}

export async function combineEntropy(): Promise<Uint8Array> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('Media devices not available');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' },
    audio: true,
  });
  try {
    const cam = await captureCameraNoiseBytes(stream);
    const mic = await captureMicNoiseBytes(stream);
    const os = Entropy.generateEntropy(256);
    const combined = await hashSha256(concat([cam.bytes, mic, os]));
    return combined;
  } finally {
    stream.getTracks().forEach((t) => t.stop());
  }
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}
