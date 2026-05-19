'use client';

import * as React from 'react';
import toast, { Toaster as HotToaster, DefaultToastOptions } from 'react-hot-toast';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

const toastStyles: DefaultToastOptions = {
  duration: 4000,
  style: {
    borderRadius: '12px',
    background: '#FFFFFF',
    color: '#1D3557',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.10)',
    border: '1px solid #DEE2E6',
    fontSize: '14px',
    padding: '12px 16px',
  },
  success: {
    icon: <CheckCircle className="h-5 w-5 text-success" />,
    style: { borderLeft: '4px solid #2DC653' },
  },
  error: {
    icon: <AlertCircle className="h-5 w-5 text-danger" />,
    style: { borderLeft: '4px solid #E63946' },
    duration: 5000,
  },
  custom: {
    icon: <Info className="h-5 w-5 text-accent" />,
    style: { borderLeft: '4px solid #457B9D' },
  },
};

function Toaster() {
  return (
    <HotToaster
      position="top-right"
      toastOptions={toastStyles}
      containerStyle={{ top: 16, right: 16 }}
    />
  );
}

export { Toaster, toast };
