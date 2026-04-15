'use client';

import { useState, useEffect } from 'react';
import { stellar } from '@/lib/stellar-helper';
import { FaShare } from 'react-icons/fa';
import { TxProgress } from '@/lib/contract-client';

// LoadingSpinner
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'white' | 'muted';
}

export function LoadingSpinner({ size = 'md', color = 'primary' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorClasses = {
    primary: 'border-primary',
    white: 'border-white',
    muted: 'border-textMuted',
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]} border-t-transparent`}
      role="status"
      aria-label="Loading"
    />
  );
}

// SkeletonLoader
interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  width?: string;
  rounded?: string;
}

export function SkeletonLoader({ count = 1, height = 'h-4', width = 'w-full', rounded = 'rounded' }: SkeletonLoaderProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse bg-borderInner ${height} ${width} ${rounded}`} />
      ))}
    </div>
  );
}

// FundingProgressBar
interface FundingProgressBarProps {
  raised: number;
  goal: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function FundingProgressBar({ raised, goal, animated = false, size = 'md' }: FundingProgressBarProps) {
  const percent = Math.min(100, Math.round((raised / goal) * 100));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (animated) {
      setMounted(true);
    }
  }, [animated]);

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const showLabels = size === 'md' || size === 'lg';

  return (
    <div className="w-full">
      <div className={`relative w-full bg-borderInner rounded-full overflow-hidden ${sizeClasses[size]}`}>
        <div
          className="bg-fundGreen rounded-full h-full transition-all duration-1000 ease-out"
          style={{
            width: animated ? (mounted ? `${percent}%` : '0%') : `${percent}%`,
          }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between mt-2">
          <span className="text-fundGreen font-medium text-xs">
            {stellar.formatXLM(raised)} XLM raised
          </span>
          <span className="text-textMuted text-xs">of {stellar.formatXLM(goal)} XLM goal</span>
        </div>
      )}
      {percent >= 100 && (
        <div className="mt-2 inline-flex items-center gap-1 bg-[#F2F8F4] text-[#2F593F] text-xs font-semibold px-2 py-1 rounded-md">
          🎉 Goal reached!
        </div>
      )}
    </div>
  );
}

// CampaignStatusBadge
interface CampaignStatusBadgeProps {
  active: boolean;
  withdrawn: boolean;
  daysLeft: number;
}

export function CampaignStatusBadge({ active, withdrawn, daysLeft }: CampaignStatusBadgeProps) {
  let status: string;
  let className: string;

  if (withdrawn) {
    status = 'Completed';
    className = 'bg-borderInner text-textMuted';
  } else if (!active) {
    status = 'Expired';
    className = 'bg-[#FEF3C7] text-[#7C4A00]';
  } else if (daysLeft <= 3) {
    status = 'Ending Soon';
    className = 'bg-[#FEF3C7] text-[#7C4A00]';
  } else {
    status = 'Active';
    className = 'bg-[#F2F8F4] text-[#2F593F]';
  }

  return (
    <span className={`${className} text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md`}>
      {status}
    </span>
  );
}

// TxProgressStepper
interface TxProgressStepperProps {
  progress: TxProgress;
}

export function TxProgressStepper({ progress }: TxProgressStepperProps) {
  const steps = ['Building', 'Signing', 'Submitting', 'Confirming'];
  const currentStepIndex = steps.findIndex(step => progress.stage.toLowerCase().includes(step.toLowerCase()));

  const getStepStatus = (index: number) => {
    if (progress.stage === 'success') return 'completed';
    if (progress.stage === 'error') return 'error';
    if (index < currentStepIndex) return 'completed';
    if (index === currentStepIndex) return 'active';
    return 'pending';
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (progress.stage === 'success') {
      await navigator.clipboard.writeText(progress.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                getStepStatus(index) === 'completed'
                  ? 'bg-fundGreen'
                  : getStepStatus(index) === 'active'
                  ? 'bg-primary animate-pulse-soft'
                  : getStepStatus(index) === 'error'
                  ? 'bg-error'
                  : 'bg-borderInner'
              }`}
            />
            <span
              className={`text-xs ${
                getStepStatus(index) === 'completed'
                  ? 'text-fundGreen'
                  : getStepStatus(index) === 'active'
                  ? 'text-primary font-medium'
                  : getStepStatus(index) === 'error'
                  ? 'text-error'
                  : 'text-textMuted'
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className="hidden sm:block w-8 h-0.5 bg-borderInner" />
            )}
          </div>
        ))}
      </div>

      {progress.stage === 'success' && (
        <div className="bg-[#F2F8F4] border border-[#E2F0E7] rounded-lg p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-[#2F593F] font-medium text-sm">Transaction Confirmed</span>
              <code className="bg-white/50 px-2 py-0.5 rounded text-[10px] text-[#2F593F] font-mono">
                {progress.hash.slice(0, 12)}...
              </code>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="text-[#2F593F] hover:text-fundGreen text-xs font-medium transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <a
                href={stellar.getExplorerLink(progress.hash, 'tx')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#2F593F] hover:text-fundGreen text-xs font-medium transition-colors"
              >
                View on Explorer
              </a>
            </div>
          </div>
        </div>
      )}

      {progress.stage === 'error' && (
        <div className="bg-[#FCF2F2] border border-[#F8E3E3] rounded-lg p-3 sm:p-4">
          <p className="text-[#8C2F2B] font-medium text-sm">{progress.message}</p>
          <p className="text-[#8C2F2B]/70 text-xs mt-1">Type: {progress.errorType}</p>
        </div>
      )}
    </div>
  );
}

// Alert
interface AlertProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  hint?: string;
  onClose: () => void;
}

export function Alert({ type, message, hint, onClose }: AlertProps) {
  const typeClasses = {
    success: 'bg-[#F2F8F4] border-[#E2F0E7] text-[#2F593F]',
    error: 'bg-[#FCF2F2] border-[#F8E3E3] text-[#8C2F2B]',
    warning: 'bg-[#FEF3C7] border-[#FDE68A] text-[#7C4A00]',
    info: 'bg-[#F4F2EC] border-[#E9E7E0] text-textMuted',
  };

  return (
    <div className={`${typeClasses[type]} border rounded-lg p-3 sm:p-4 animate-slide-up`}>
      <div className="flex justify-between items-start gap-2">
        <div>
          <p className="font-medium text-sm">{message}</p>
          {hint && <p className="text-xs mt-1 opacity-80">{hint}</p>}
        </div>
        <button onClick={onClose} className="text-current opacity-60 hover:opacity-100 transition-opacity">
          ✕
        </button>
      </div>
    </div>
  );
}

// Input
interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  min?: string;
  step?: string;
  maxLength?: number;
}

export function Input({ label, value, onChange, placeholder, error, type = 'text', disabled, hint, required, min, step, maxLength }: InputProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-textMain">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        maxLength={maxLength}
        className={`claude-input ${error ? 'border-error focus:border-error' : ''}`}
      />
      {hint && !error && <p className="text-xs text-textMuted">{hint}</p>}
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

// Textarea
interface TextareaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  rows?: number;
  maxLength?: number;
  hint?: string;
  required?: boolean;
}

export function Textarea({ label, value, onChange, placeholder, error, rows = 4, maxLength, hint, required }: TextareaProps) {
  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-textMain">
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`claude-textarea ${error ? 'border-error focus:border-error' : ''}`}
      />
      <div className="flex justify-between">
        {hint && !error && <p className="text-xs text-textMuted">{hint}</p>}
        {maxLength && (
          <p className="text-xs text-textMuted ml-auto">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  );
}

// Button
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  fullWidth?: boolean;
  type?: 'button' | 'submit';
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({ children, onClick, variant = 'primary', disabled, fullWidth, type = 'button', loading, icon, className }: ButtonProps) {
  const baseClasses = 'claude-button';
  const variantClasses = {
    primary: 'claude-button-primary',
    secondary: 'claude-button-secondary',
    danger: 'bg-error text-white hover:bg-[#7A2A27] border border-transparent shadow-sm',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${fullWidth ? 'w-full' : ''} ${loading ? 'cursor-wait' : ''} ${className || ''}`}
    >
      {loading ? (
        <LoadingSpinner size="sm" color="white" />
      ) : (
        <div className="flex items-center justify-center gap-2">
          {icon}
          {children}
        </div>
      )}
    </button>
  );
}

// Card
interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function Card({ title, subtitle, icon, children, className, action }: CardProps) {
  return (
    <div className={`claude-card p-5 sm:p-6 ${className || ''}`}>
      {(title || subtitle || icon || action) && (
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && <div className="text-primary">{icon}</div>}
            <div>
              {title && <h3 className="font-semibold text-textMain">{title}</h3>}
              {subtitle && <p className="text-sm text-textMuted mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

// EmptyState
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 border-2 border-dashed border-borderInner rounded-xl">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="font-semibold text-textMain text-lg mb-2">{title}</h3>
      <p className="text-textMuted text-center text-sm mb-6 max-w-md">{description}</p>
      {action}
    </div>
  );
}

// ShareButton
interface ShareButtonProps {
  url: string;
  title: string;
}

export function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className="claude-button-secondary text-xs px-3 py-1.5"
    >
      <FaShare className="w-3 h-3" />
      {copied ? 'Copied!' : 'Share'}
    </button>
  );
}
