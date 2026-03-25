'use client';

import { useEffect } from 'react';

interface IOSAlertProps {
  open: boolean;
  title: string;
  message: string;
  cancelText?: string;
  confirmText: string;
  confirmDanger?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function IOSAlert({
  open,
  title,
  message,
  cancelText = 'Batal',
  confirmText,
  confirmDanger = false,
  onCancel,
  onConfirm,
}: IOSAlertProps) {
  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <>
      <div className="backdrop" onClick={onCancel} />
      <div className="ios-alert animate-scaleIn" role="alertdialog" aria-modal="true">
        <h3 className="ios-alert-title">{title}</h3>
        <p className="ios-alert-message">{message}</p>
        <div className="ios-alert-buttons">
          <button type="button" className="ios-alert-btn ios-alert-btn-bold" onClick={onCancel}>
            {cancelText}
          </button>
          <button
            type="button"
            className={`ios-alert-btn ${confirmDanger ? 'ios-alert-btn-danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </>
  );
}
