"use client";

import React from "react";
import { CheckCircle, X, AlertCircle, Info } from "lucide-react";

interface ToastProps {
  message: string;
  type: "success" | "error" | "info" | "warning";
  isVisible: boolean;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, isVisible, onClose }) => {
  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case "error":
        return <X className="h-5 w-5 text-red-500 dark:text-red-400" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />;
      case "info":
      default:
        return <Info className="h-5 w-5 text-blue-500 dark:text-blue-400" />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200";
      case "error":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200";
      case "warning":
        return "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200";
      case "info":
      default:
        return "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-right-full duration-300">
      <div className={`min-w-72 max-w-sm p-4 border-l-4 border rounded-lg shadow-lg ${getBackgroundColor()}`}>
        <div className="flex items-center gap-3">
          {getIcon()}
          <p className="flex-1 text-sm font-medium">{message}</p>
          <button
            onClick={onClose}
            className="ml-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
