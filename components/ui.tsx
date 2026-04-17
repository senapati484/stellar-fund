"use client";

import { useState, useEffect } from "react";
import { stellar } from "@/lib/stellar-helper";
import { FaShare, FaCheck, FaTimes } from "react-icons/fa";
import { TxProgress } from "@/lib/contract-client";

/* ==================== Loading Spinner ==================== */
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  color?: "primary" | "white" | "muted";
}

export function LoadingSpinner({
  size = "md",
  color = "primary",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    primary: "border-primary",
    white: "border-white",
    muted: "border-textMuted",
  };

  return (
    <div
      className={`animate-spin rounded-full border-2 ${sizeClasses[size]} ${colorClasses[color]} border-t-transparent`}
      role="status"
      aria-label="Loading"
    />
  );
}

/* ==================== Skeleton Loader ==================== */
interface SkeletonLoaderProps {
  count?: number;
  height?: string;
  width?: string;
  rounded?: string;
}

export function SkeletonLoader({
  count = 1,
  height = "h-4",
  width = "w-full",
  rounded = "rounded-lg",
}: SkeletonLoaderProps) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gradient-to-r from-borderInner to-borderInner/50 ${height} ${width} ${rounded}`}
        />
      ))}
    </div>
  );
}

/* ==================== Funding Progress Bar ==================== */
interface FundingProgressBarProps {
  raised: number;
  goal: number;
  animated?: boolean;
  size?: "sm" | "md" | "lg";
}

export function FundingProgressBar({
  raised,
  goal,
  animated = false,
  size = "md",
}: FundingProgressBarProps) {
  const percent = Math.min(100, Math.round((raised / goal) * 100));
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (animated) {
      setMounted(true);
    }
  }, [animated]);

  const sizeClasses = {
    sm: "h-1.5",
    md: "h-2.5",
    lg: "h-4",
  };

  const showLabels = size === "md" || size === "lg";

  return (
    <div className="w-full space-y-2">
      <div
        className={`relative w-full bg-borderInner rounded-full overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          className="bg-gradient-to-r from-success to-emerald-500 rounded-full h-full transition-all duration-1000 ease-out"
          style={{
            width: animated ? (mounted ? `${percent}%` : "0%") : `${percent}%`,
          }}
        />
      </div>
      {showLabels && (
        <div className="flex justify-between items-center">
          <span className="text-success font-semibold text-sm">
            {raised.toFixed(2)} XLM raised
          </span>
          <span className="text-textMuted text-sm">
            of {goal.toFixed(2)} XLM goal
          </span>
        </div>
      )}
      {percent >= 100 && (
        <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-green-200">
          <FaCheck className="w-3 h-3" />
          Goal reached!
        </div>
      )}
    </div>
  );
}

/* ==================== Campaign Status Badge ==================== */
interface CampaignStatusBadgeProps {
  active: boolean;
  withdrawn: boolean;
  daysLeft: number;
}

export function CampaignStatusBadge({
  active,
  withdrawn,
  daysLeft,
}: CampaignStatusBadgeProps) {
  let status: string;
  let bgColor: string;
  let textColor: string;

  if (withdrawn) {
    status = "Completed";
    bgColor = "bg-gray-100";
    textColor = "text-gray-600";
  } else if (!active) {
    status = "Expired";
    bgColor = "bg-amber-50";
    textColor = "text-amber-700";
  } else if (daysLeft <= 3) {
    status = "Ending Soon";
    bgColor = "bg-orange-50";
    textColor = "text-orange-700";
  } else {
    status = "Active";
    bgColor = "bg-green-50";
    textColor = "text-green-700";
  }

  return (
    <span
      className={`${bgColor} ${textColor} text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-lg border ${textColor === "text-gray-600" ? "border-gray-200" : "border-current/20"}`}
    >
      {status}
    </span>
  );
}

/* ==================== Transaction Progress Stepper ==================== */
interface TxProgressStepperProps {
  progress: TxProgress;
}

export function TxProgressStepper({ progress }: TxProgressStepperProps) {
  const steps = ["Building", "Signing", "Submitting", "Confirming"];
  const currentStepIndex = steps.findIndex((step) =>
    progress.stage.toLowerCase().includes(step.toLowerCase()),
  );

  const getStepStatus = (index: number) => {
    if (progress.stage === "success") return "completed";
    if (progress.stage === "error") return "error";
    if (index < currentStepIndex) return "completed";
    if (index === currentStepIndex) return "active";
    return "pending";
  };

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (progress.stage === "success") {
      await navigator.clipboard.writeText(progress.hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-4 animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs transition-all duration-300 ${
                  getStepStatus(index) === "completed"
                    ? "bg-success text-white"
                    : getStepStatus(index) === "active"
                      ? "bg-primary text-white animate-pulse-soft"
                      : getStepStatus(index) === "error"
                        ? "bg-error text-white"
                        : "bg-borderInner text-textMuted"
                }`}
              >
                {getStepStatus(index) === "completed" ? (
                  <FaCheck className="w-3 h-3" />
                ) : (
                  index + 1
                )}
              </div>
            </div>
            <span
              className={`text-sm font-medium ${
                getStepStatus(index) === "completed"
                  ? "text-success"
                  : getStepStatus(index) === "active"
                    ? "text-primary"
                    : getStepStatus(index) === "error"
                      ? "text-error"
                      : "text-textMuted"
              }`}
            >
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className="hidden sm:block flex-1 h-0.5 bg-borderInner mx-2" />
            )}
          </div>
        ))}
      </div>

      {progress.stage === "success" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <FaCheck className="w-5 h-5 text-success flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-700">
                Transaction Confirmed
              </p>
              <p className="text-xs text-green-600 mt-0.5">
                Transaction hash: {progress.hash.slice(0, 20)}...
              </p>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleCopy}
              variant="secondary"
              size="sm"
              className="flex-1"
            >
              {copied ? "Copied!" : "Copy Hash"}
            </Button>
            <a
              href={stellar.getExplorerLink(progress.hash, "tx")}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="ghost" size="sm" className="w-full">
                View on Explorer →
              </Button>
            </a>
          </div>
        </div>
      )}

      {progress.stage === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex gap-3">
            <FaTimes className="w-5 h-5 text-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-error">{progress.message}</p>
              <p className="text-xs text-error/70 mt-1">
                Error Type: {progress.errorType}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== Alert Component ==================== */
interface AlertProps {
  type: "success" | "error" | "warning" | "info";
  message: string;
  hint?: string;
  onClose: () => void;
}

export function Alert({ type, message, hint, onClose }: AlertProps) {
  const typeConfig = {
    success: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      icon: <FaCheck className="w-5 h-5" />,
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      icon: <FaTimes className="w-5 h-5" />,
    },
    warning: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      icon: "⚠️",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-700",
      icon: "ℹ️",
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${config.bg} border ${config.border} rounded-xl p-4 animate-slide-up`}
    >
      <div className="flex gap-3">
        <div className={`${config.text} flex-shrink-0 mt-0.5`}>
          {typeof config.icon === "string" ? (
            <span>{config.icon}</span>
          ) : (
            config.icon
          )}
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${config.text}`}>{message}</p>
          {hint && <p className={`text-sm ${config.text}/70 mt-1`}>{hint}</p>}
        </div>
        <button
          onClick={onClose}
          className={`${config.text} opacity-60 hover:opacity-100 transition-opacity flex-shrink-0`}
        >
          <FaTimes className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ==================== Input Component ==================== */
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

export function Input({
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
  disabled,
  hint,
  required,
  min,
  step,
  maxLength,
}: InputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#1a1a1a]">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        step={step}
        maxLength={maxLength}
        className={`claude-input transition-all ${error ? "border-error focus:border-error focus:ring-error" : ""}`}
      />
      {hint && !error && <p className="text-xs text-[#888888]">{hint}</p>}
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

/* ==================== Textarea Component ==================== */
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

export function Textarea({
  label,
  value,
  onChange,
  placeholder,
  error,
  rows = 4,
  maxLength,
  hint,
  required,
}: TextareaProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[#1a1a1a]">
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        className={`claude-textarea transition-all ${error ? "border-error focus:border-error" : ""}`}
      />
      <div className="flex justify-between items-end">
        {hint && !error && <p className="text-xs text-[#888888]">{hint}</p>}
        {maxLength && (
          <p
            className={`text-xs font-medium ${value.length > maxLength * 0.9 ? "text-red-600" : "text-[#888888]"}`}
          >
            {value.length}/{maxLength}
          </p>
        )}
      </div>
      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
    </div>
  );
}

/* ==================== Button Component ==================== */
interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void | Promise<void>;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  size?: "sm" | "md" | "lg" | "xl";
  disabled?: boolean;
  fullWidth?: boolean;
  type?: "button" | "submit" | "reset";
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function Button({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  fullWidth,
  type = "button",
  loading,
  icon,
  className,
}: ButtonProps) {
  const baseClasses = "claude-button";
  const variantClasses = {
    primary: "claude-button-primary",
    secondary: "claude-button-secondary",
    danger: "claude-button-danger",
    success: "claude-button-success",
    ghost: "claude-button-ghost",
  };

  const sizeClasses = {
    sm: "size-sm",
    md: "",
    lg: "size-lg",
    xl: "size-xl",
  };

  const disabledClasses = disabled ? "opacity-60 cursor-not-allowed" : "";
  const widthClasses = fullWidth ? "w-full" : "";
  const cursorClasses = loading
    ? "cursor-wait"
    : !disabled
      ? "cursor-pointer"
      : "";

  const combinedClassName =
    `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${widthClasses} ${cursorClasses} ${disabledClasses} ${className || ""}`.trim();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={combinedClassName}
    >
      {loading ? (
        <LoadingSpinner
          size="sm"
          color={variant === "ghost" ? "muted" : "white"}
        />
      ) : (
        <>
          {icon && <span className="inline-flex flex-shrink-0">{icon}</span>}
          <span className="inline-flex">{children}</span>
        </>
      )}
    </button>
  );
}

/* ==================== Card Component ==================== */
interface CardProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
  elevated?: boolean;
}

export function Card({
  title,
  subtitle,
  icon,
  children,
  className,
  action,
  elevated,
}: CardProps) {
  return (
    <div
      className={`${elevated ? "claude-card-elevated" : "claude-card"} p-6 ${className || ""}`}
    >
      {(title || subtitle || icon || action) && (
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-start gap-4">
            {icon && (
              <div className="text-primary text-2xl flex-shrink-0 mt-1">
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="font-serif text-lg font-semibold text-textMain">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-textMuted mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </div>
      )}
      <div className={title || subtitle ? "mt-4" : ""}>{children}</div>
    </div>
  );
}

/* ==================== Empty State Component ==================== */
interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-borderInner rounded-2xl bg-gradient-to-b from-surface to-background/50">
      <div className="text-5xl mb-4">{icon}</div>
      <h3 className="font-serif text-xl font-semibold text-textMain mb-2 text-center">
        {title}
      </h3>
      <p className="text-textMuted text-center text-sm mb-6 max-w-md leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ==================== Share Button Component ==================== */
interface ShareButtonProps {
  url: string;
  title: string;
}

export function ShareButton({ url, title }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="secondary"
      size="sm"
      icon={<FaShare className="w-3.5 h-3.5" />}
    >
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}

/* ==================== Badge Component ==================== */
interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "error" | "warning" | "info";
  size?: "sm" | "md";
}

export function Badge({
  children,
  variant = "default",
  size = "md",
}: BadgeProps) {
  const variantStyles = {
    default: "bg-borderInner text-textMain",
    success: "bg-green-50 text-green-700 border border-green-200",
    error: "bg-red-50 text-error border border-red-200",
    warning: "bg-amber-50 text-amber-700 border border-amber-200",
    info: "bg-blue-50 text-blue-700 border border-blue-200",
  };

  const sizeStyles = {
    sm: "px-2 py-1 text-xs",
    md: "px-3 py-1.5 text-sm",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {children}
    </span>
  );
}

/* ==================== Divider Component ==================== */
interface DividerProps {
  variant?: "light" | "normal";
  className?: string;
}

export function Divider({ variant = "normal", className }: DividerProps) {
  return (
    <div
      className={`divider ${variant === "light" ? "divider-light" : ""} ${className || ""}`}
    />
  );
}

/* ==================== Stats Card Component ==================== */
interface StatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export function StatsCard({
  label,
  value,
  unit,
  icon,
  trend,
  trendValue,
}: StatsCardProps) {
  return (
    <Card className="text-center">
      {icon && <div className="text-3xl mb-3 text-center">{icon}</div>}
      <p className="text-textMuted text-xs uppercase tracking-widest mb-2">
        {label}
      </p>
      <div className="flex items-baseline justify-center gap-1">
        <p className="text-3xl font-semibold text-textMain font-serif">
          {value}
        </p>
        {unit && <span className="text-textMuted text-sm">{unit}</span>}
      </div>
      {trendValue && (
        <p
          className={`text-xs font-medium mt-2 ${
            trend === "up"
              ? "text-fundGreen"
              : trend === "down"
                ? "text-error"
                : "text-textMuted"
          }`}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </p>
      )}
    </Card>
  );
}
