'use client';

import { useState } from 'react';
import { TxProgress } from '@/lib/contract-client';
import { stellar } from '@/lib/stellar-helper';
import { useCampaigns } from './CampaignProvider';
import { Input, Textarea, TxProgressStepper, Alert, Button } from './ui';
import { FaCheck } from 'react-icons/fa';

interface CreateCampaignFormProps {
  publicKey: string;
  onSuccess: (campaignId: number) => void;
}

export function CreateCampaignForm({ publicKey, onSuccess }: CreateCampaignFormProps) {
  const { addCampaign } = useCampaigns();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [goalXlm, setGoalXlm] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    goalXlm?: string;
    durationDays?: string;
  }>({});
  const [progress, setProgress] = useState<TxProgress>({ stage: 'idle' });
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; message: string; hint?: string } | null>(null);

  const validateStep1 = () => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title || title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    } else if (title.length > 80) {
      newErrors.title = 'Title must be less than 80 characters';
    }

    if (!description || description.length < 20) {
      newErrors.description = 'Description must be at least 20 characters';
    } else if (description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: { goalXlm?: string; durationDays?: string } = {};

    const goal = parseFloat(goalXlm);
    const duration = parseInt(durationDays);

    if (!goalXlm || isNaN(goal) || goal <= 0) {
      newErrors.goalXlm = 'Goal must be greater than 0';
    } else if (goal > 1_000_000) {
      newErrors.goalXlm = 'Goal must be less than 1,000,000 XLM';
    }

    if (!durationDays || isNaN(duration) || duration < 7) {
      newErrors.durationDays = 'Duration must be at least 7 days';
    } else if (duration > 60) {
      newErrors.durationDays = 'Duration must be less than 60 days';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    }
  };

  const handleSubmit = async () => {
    try {
      setProgress({ stage: 'building', message: 'Building transaction…' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress({ stage: 'signing', message: 'Waiting for wallet signature…' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress({ stage: 'submitting', message: 'Broadcasting to network…' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      setProgress({ stage: 'confirming', message: 'Confirming on-chain…' });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const duration = parseInt(durationDays);
      const deadline = Math.floor(Date.now() / 1000) + (duration * 24 * 60 * 60);

      const campaignId = addCampaign({
        title,
        description,
        goal: parseFloat(goalXlm),
        deadline,
        owner: publicKey,
      });

      console.log('Campaign added with ID:', campaignId);

      const hash = 'simulated-tx-hash';
      setProgress({ stage: 'success', message: 'Confirmed!', hash });

      setAlert({
        type: 'success',
        message: 'Campaign launched successfully!',
        hint: `Campaign ID: ${campaignId}`,
      });

      setTimeout(() => {
        onSuccess(campaignId);
      }, 1500);
    } catch (error) {
      setAlert({
        type: 'error',
        message: 'Failed to launch campaign.',
        hint: error instanceof Error ? error.message : 'Unknown error',
      });
      setProgress({ stage: 'idle' });
    }
  };

  const getDeadline = () => {
    const duration = parseInt(durationDays);
    if (isNaN(duration)) return '—';
    const date = new Date();
    date.setDate(date.getDate() + duration);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStroops = () => {
    const goal = parseFloat(goalXlm);
    if (isNaN(goal)) return '—';
    return (goal * 10_000_000).toLocaleString();
  };

  return (
    <div className="claude-card p-5 sm:p-6">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                s < step
                  ? 'bg-success text-white'
                  : s === step
                  ? 'bg-primary text-white'
                  : 'bg-borderInner text-textMuted'
              }`}
            >
              {s < step ? <FaCheck className="w-4 h-4" /> : s}
            </div>
            <span className="ml-2 text-xs font-medium text-textMuted hidden sm:block">
              {s === 1 ? 'Details' : s === 2 ? 'Goal' : 'Review'}
            </span>
            {s < 3 && <div className="w-8 h-0.5 bg-borderInner ml-2 hidden sm:block" />}
          </div>
        ))}
      </div>

      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          hint={alert.hint}
          onClose={() => setAlert(null)}
        />
      )}

      {step === 1 && (
        <div className="space-y-4 animate-slide-up">
          <h3 className="font-serif font-medium text-lg text-textMain mb-4">Campaign Details</h3>
          
          <Input
            label="Campaign Title"
            value={title}
            onChange={setTitle}
            placeholder="Enter a catchy title for your campaign"
            error={errors.title}
            maxLength={80}
            required
          />
          <p className="text-textMuted text-xs">{title.length}/80</p>

          <Textarea
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="Describe your campaign in detail. What are you building? Who will benefit?"
            error={errors.description}
            rows={4}
            maxLength={500}
            required
          />
          <p className="text-textMuted text-xs">{description.length}/500</p>

          <Button onClick={handleNext} variant="primary" fullWidth>
            Next →
          </Button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4 animate-slide-up">
          <h3 className="font-serif font-medium text-lg text-textMain mb-4">Funding Goal</h3>

          <Input
            label="Funding Goal (XLM)"
            value={goalXlm}
            onChange={setGoalXlm}
            placeholder="100"
            type="number"
            min="1"
            error={errors.goalXlm}
            required
          />
          <p className="text-textMuted text-xs font-mono">= {getStroops()} stroops</p>

          <div>
            <label className="block text-sm font-medium text-textMain mb-2">Campaign Duration</label>
            <div className="flex flex-wrap gap-2">
              {['7', '14', '30', '60'].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200 ${
                    durationDays === days
                      ? 'bg-primary text-white shadow-md ring-2 ring-primary ring-offset-2 ring-offset-surface'
                      : 'bg-surface border-2 border-borderInner text-textMain hover:border-primary hover:shadow-sm'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
            {errors.durationDays && <p className="text-error text-xs mt-1">{errors.durationDays}</p>}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setStep(1)} variant="secondary" fullWidth>
              ← Back
            </Button>
            <Button onClick={handleNext} variant="primary" fullWidth>
              Next →
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4 animate-slide-up">
          <h3 className="font-serif font-medium text-lg text-textMain mb-4">Review & Submit</h3>

          <div className="bg-[#F4F2EC] border border-[#E9E7E0] rounded-xl p-5 space-y-3">
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Campaign Title</span>
              <span className="text-textMain text-sm font-medium">{title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Description</span>
              <span className="text-textMain text-sm font-medium max-w-[200px] truncate">
                {description}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Goal</span>
              <span className="text-textMain text-sm font-medium">{goalXlm} XLM</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Duration</span>
              <span className="text-textMain text-sm font-medium">{durationDays} days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Deadline</span>
              <span className="text-textMain text-sm font-medium">{getDeadline()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-textMuted text-sm">Your wallet</span>
              <span className="text-textMain text-sm font-medium font-mono">
                {stellar.formatAddress(publicKey, 6, 4)}
              </span>
            </div>
          </div>

          {progress.stage !== 'idle' && <TxProgressStepper progress={progress} />}

          {progress.stage === 'idle' && (
            <div className="flex gap-2">
              <Button onClick={() => setStep(2)} variant="secondary" fullWidth>
                ← Edit
              </Button>
              <Button onClick={handleSubmit} variant="primary" fullWidth>
                Launch Campaign 🚀
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
