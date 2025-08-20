'use client';

import React from 'react';
import { Button, Input } from '@btc-wallet/ui';

export interface ExportPasswordModalProps {
  isOpen: boolean;
  mode: 'wallet-json' | 'wif-only';
  password: string;
  onPasswordChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ExportPasswordModal({
  isOpen,
  mode,
  password,
  onPasswordChange,
  onCancel,
  onConfirm,
}: ExportPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-gray-700 rounded-xl max-w-sm w-full p-4">
        <h3 className="text-lg font-semibold mb-2">
          {mode === 'wallet-json'
            ? 'Encrypt Full Wallet Export'
            : 'Encrypt WIF Export'}
        </h3>
        <p className="text-sm text-gray-400 mb-4">
          Enter a password to encrypt the export. Do not forget this password.
        </p>
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) =>
            onPasswordChange((e.target as HTMLInputElement).value)
          }
        />
        <div className="mt-4 flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" icon="fas fa-lock" onClick={onConfirm}>
            Encrypt & Save
          </Button>
        </div>
      </div>
    </div>
  );
}
