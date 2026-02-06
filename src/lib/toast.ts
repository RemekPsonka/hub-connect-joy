import { toast } from 'sonner';
import { createElement } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

export const showToast = {
  success: (message: string) => {
    toast(message, {
      icon: createElement(CheckCircle, { className: 'h-5 w-5 text-emerald-500' }),
      duration: 4000,
      className: 'border-l-4 border-l-emerald-500',
    });
  },

  error: (message: string, details?: string) => {
    toast(message, {
      icon: createElement(XCircle, { className: 'h-5 w-5 text-red-500' }),
      duration: 8000,
      description: details,
      className: 'border-l-4 border-l-red-500',
    });
  },

  warning: (message: string) => {
    toast(message, {
      icon: createElement(AlertTriangle, { className: 'h-5 w-5 text-amber-500' }),
      duration: 6000,
      className: 'border-l-4 border-l-amber-500',
    });
  },

  info: (message: string) => {
    toast(message, {
      icon: createElement(Info, { className: 'h-5 w-5 text-blue-500' }),
      duration: 4000,
      className: 'border-l-4 border-l-blue-500',
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },
};
