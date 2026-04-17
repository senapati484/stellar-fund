"use client";

import { useState } from "react";
import { TxProgress } from "@/lib/contract-client";
import { stellar } from "@/lib/stellar-helper";
import { useCampaigns } from "./CampaignProvider";
import { Input, Textarea, TxProgressStepper, Alert, Button } from "./ui";
import { FaCheck } from "react-icons/fa";

interface CreateCampaignFormProps {
  publicKey: string;
  onSuccess: (campaignId: number) => void;
}

export function CreateCampaignForm({
  publicKey,
  onSuccess,
}: CreateCampaignFormProps) {
  const { addCampaign } = useCampaigns();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goalXlm, setGoalXlm] = useState("10");
  const [durationDays, setDurationDays] = useState("30");
  const [capDonationsAtGoal, setCapDonationsAtGoal] = useState(true);
  const [errors, setErrors] = useState<{
    title?: string;
    description?: string;
    goalXlm?: string;
    durationDays?: string;
  }>({});
  const [progress, setProgress] = useState<TxProgress>({ stage: "idle" });
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    message: string;
    hint?: string;
  } | null>(null);

  const validateStep1 = () => {
    const newErrors: { title?: string; description?: string } = {};

    if (!title || title.length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    } else if (title.length > 80) {
      newErrors.title = "Title must be less than 80 characters";
    }

    if (!description || description.length < 20) {
      newErrors.description = "Description must be at least 20 characters";
    } else if (description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: { goalXlm?: string; durationDays?: string } = {};

    const goal = parseFloat(goalXlm);
    const duration = parseInt(durationDays);

    if (!goalXlm || isNaN(goal) || goal <= 0) {
      newErrors.goalXlm = "Goal must be greater than 0";
    } else if (goal > 1_000_000) {
      newErrors.goalXlm = "Goal must be less than 1,000,000 XLM";
    }

    if (!durationDays || isNaN(duration) || duration < 7) {
      newErrors.durationDays = "Duration must be at least 7 days";
    } else if (duration > 60) {
      newErrors.durationDays = "Duration must be less than 60 days";
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
      setProgress({ stage: "building", message: "Building transaction…" });

      // Small UX delays so users see progress steps
      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgress({
        stage: "signing",
        message: "Waiting for wallet signature…",
      });

      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgress({ stage: "submitting", message: "Broadcasting to network…" });

      await new Promise((resolve) => setTimeout(resolve, 600));

      setProgress({ stage: "confirming", message: "Confirming on-chain…" });

      await new Promise((resolve) => setTimeout(resolve, 600));

      const duration = parseInt(durationDays);
      const deadline = Math.floor(Date.now() / 1000) + duration * 24 * 60 * 60;

      const goalValue = parseFloat(goalXlm);
      console.log(
        "Goal value being saved:",
        goalValue,
        "from string:",
        goalXlm,
      );

      const campaignId = await addCampaign({
        title,
        description,
        goal: goalValue,
        deadline,
        owner: publicKey,
      });

      console.log("Campaign added with ID:", campaignId);

      setProgress({
        stage: "success",
        message: "Confirmed!",
        hash: "simulated-tx-hash",
      });

      setAlert({
        type: "success",
        message: "Campaign launched successfully!",
        hint: `Campaign ID: ${campaignId}`,
      });

      setTimeout(() => {
        onSuccess(campaignId);
      }, 1200);
    } catch (error) {
      setAlert({
        type: "error",
        message: "Failed to launch campaign.",
        hint: error instanceof Error ? error.message : "Unknown error",
      });
      setProgress({ stage: "idle" });
    }
  };

  const getDeadline = () => {
    const duration = parseInt(durationDays);
    if (isNaN(duration)) return "—";
    const date = new Date();
    date.setDate(date.getDate() + duration);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStroops = () => {
    const goal = parseFloat(goalXlm);
    if (isNaN(goal)) return "—";
    return (goal * 10_000_000).toLocaleString();
  };

  return (
    <div className="claude-card p-6 sm:p-8">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-3 sm:gap-6 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-200 ${
                s < step
                  ? "bg-[#059669] text-white"
                  : s === step
                    ? "bg-[#d97450] text-white"
                    : "bg-[#e5e5e5] text-[#555555]"
              }`}
            >
              {s < step ? <FaCheck className="w-5 h-5" /> : s}
            </div>
            <span className="text-xs font-medium text-[#555555] hidden sm:block whitespace-nowrap">
              {s === 1 ? "Details" : s === 2 ? "Goal" : "Review"}
            </span>
            {s < 3 && (
              <div className="w-6 h-0.5 bg-[#e5e5e5] hidden sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* Alert */}
      {alert && (
        <Alert
          type={alert.type}
          message={alert.message}
          hint={alert.hint}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Step 1: Campaign Details */}
      {step === 1 && (
        <div className="space-y-6 animate-slide-up">
          <div>
            <h3 className="font-serif font-semibold text-xl text-[#1a1a1a] mb-1">
              Campaign Details
            </h3>
            <p className="text-sm text-[#555555]">
              Tell us about your campaign
            </p>
          </div>

          <div>
            <Input
              label="Campaign Title"
              value={title}
              onChange={setTitle}
              placeholder="e.g., Community Art Installation"
              error={errors.title}
              maxLength={80}
              required
            />
            <p className="text-xs text-[#888888] mt-2">
              {title.length}/80 characters
            </p>
          </div>

          <div>
            <Textarea
              label="Description"
              value={description}
              onChange={setDescription}
              placeholder="Describe your campaign in detail. What are you building? Who will benefit? Why should people donate?"
              error={errors.description}
              rows={5}
              maxLength={500}
              required
            />
            <p className="text-xs text-[#888888] mt-2">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button onClick={handleNext} variant="primary" fullWidth size="lg">
              Next: Funding Goal →
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Funding Goal */}
      {step === 2 && (
        <div className="space-y-6 animate-slide-up">
          <div>
            <h3 className="font-serif font-semibold text-xl text-[#1a1a1a] mb-1">
              Funding Goal
            </h3>
            <p className="text-sm text-[#555555]">
              Set your target and timeline
            </p>
          </div>

          <div>
            <Input
              label="Funding Goal (XLM)"
              value={goalXlm}
              onChange={setGoalXlm}
              placeholder="10"
              type="number"
              min="1"
              error={errors.goalXlm}
              required
            />
            <p className="text-xs text-[#888888] font-mono mt-2">
              = {getStroops()} stroops
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#1a1a1a] mb-3">
              Campaign Duration
            </label>
            <div className="flex flex-wrap gap-2">
              {["7", "14", "30", "60"].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setDurationDays(days)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 min-h-[2.5rem] flex items-center justify-center ${
                    durationDays === days
                      ? "bg-[#d97450] text-white shadow-lg font-semibold border-2 border-[#d97450]"
                      : "bg-white border-2 border-[#e5e5e5] text-[#1a1a1a] hover:border-[#d97450] hover:shadow-md"
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
            {errors.durationDays && (
              <p className="text-sm text-red-600 mt-2">{errors.durationDays}</p>
            )}
          </div>

          <div className="bg-[#f5f5f5] rounded-lg p-4 space-y-2 border border-[#e5e5e5]">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="capDonations"
                checked={capDonationsAtGoal}
                onChange={(e) => setCapDonationsAtGoal(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#d97450] cursor-pointer"
              />
              <label
                htmlFor="capDonations"
                className="text-sm text-[#1a1a1a] cursor-pointer"
              >
                <span className="font-medium">Cap donations at goal</span>
                <p className="text-xs text-[#555555] mt-1">
                  Stop accepting donations once the goal is reached
                </p>
              </label>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              onClick={() => setStep(1)}
              variant="secondary"
              fullWidth
              size="lg"
            >
              ← Back
            </Button>
            <Button onClick={handleNext} variant="primary" fullWidth size="lg">
              Next: Review →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-6 animate-slide-up">
          <div>
            <h3 className="font-serif font-semibold text-xl text-[#1a1a1a] mb-1">
              Review & Launch
            </h3>
            <p className="text-sm text-[#555555]">
              Verify your campaign details before launching
            </p>
          </div>

          <div className="bg-[#f5f5f5] border border-[#e5e5e5] rounded-lg p-6 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#555555]">Campaign Title</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {title}
                </span>
              </div>
              <div className="h-px bg-[#e5e5e5]" />

              <div className="flex justify-between items-start gap-4">
                <span className="text-sm text-[#555555]">Description</span>
                <span className="text-sm font-medium text-[#1a1a1a] text-right max-w-xs">
                  {description}
                </span>
              </div>
              <div className="h-px bg-[#e5e5e5]" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-[#555555]">Funding Goal</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {goalXlm} XLM
                </span>
              </div>
              <div className="h-px bg-[#e5e5e5]" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-[#555555]">Duration</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {durationDays} days
                </span>
              </div>
              <div className="h-px bg-[#e5e5e5]" />

              <div className="flex justify-between items-center">
                <span className="text-sm text-[#555555]">Deadline</span>
                <span className="text-sm font-semibold text-[#1a1a1a]">
                  {getDeadline()}
                </span>
              </div>
              <div className="h-px bg-[#e5e5e5]" />

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm text-[#555555]">Campaign Owner</span>
                <span className="text-xs font-mono text-[#1a1a1a] bg-white px-3 py-1.5 rounded border border-[#e5e5e5]">
                  {stellar.formatAddress(publicKey, 6, 4)}
                </span>
              </div>
            </div>
          </div>

          {progress.stage !== "idle" && (
            <TxProgressStepper progress={progress} />
          )}

          {progress.stage === "idle" && (
            <div className="flex gap-3 pt-2">
              <Button
                onClick={() => setStep(2)}
                variant="secondary"
                fullWidth
                size="lg"
              >
                ← Edit
              </Button>
              <Button
                onClick={handleSubmit}
                variant="primary"
                fullWidth
                size="lg"
              >
                🚀 Launch Campaign
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
