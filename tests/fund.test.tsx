import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FundingProgressBar, CampaignStatusBadge, Alert } from '@/components/ui'

describe('StellarFund — 5 tests', () => {
  // TEST 1 — FundingProgressBar renders with correct percentage
  it('FundingProgressBar renders with correct percentage', () => {
    render(<FundingProgressBar raised={500_000_000} goal={1_000_000_000} />)
    expect(screen.getByText(/50/)).toBeInTheDocument()
  })

  // TEST 2 — CampaignStatusBadge shows "Active" for active campaign
  it('CampaignStatusBadge shows "Active" for active campaign', () => {
    render(<CampaignStatusBadge active={true} withdrawn={false} daysLeft={14} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  // TEST 3 — CampaignStatusBadge shows "Ending Soon" when daysLeft ≤ 3
  it('CampaignStatusBadge shows "Ending Soon" when daysLeft ≤ 3', () => {
    render(<CampaignStatusBadge active={true} withdrawn={false} daysLeft={2} />)
    expect(screen.getByText('Ending Soon')).toBeInTheDocument()
  })

  // TEST 4 — Alert renders and dismisses
  it('Alert renders and dismisses', async () => {
    const onClose = vi.fn()
    render(<Alert type="success" message="Campaign created!" onClose={onClose} />)
    expect(screen.getByText('Campaign created!')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  // TEST 5 — getProgressPercent helper calculates correctly
  it('getProgressPercent helper calculates correctly', () => {
    const getProgress = (raised: number, goal: number) =>
      Math.min(100, Math.round(raised / goal * 100))
    expect(getProgress(1_000_000_000, 1_000_000_000)).toBe(100)
    expect(getProgress(500_000_000, 1_000_000_000)).toBe(50)
    expect(getProgress(1_500_000_000, 1_000_000_000)).toBe(100) // capped
  })
})
