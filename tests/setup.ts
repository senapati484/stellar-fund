import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next/font/google', () => ({
  Inter: () => ({ variable: '--font-sans', className: '' }),
  Fraunces: () => ({ variable: '--font-serif', className: '' }),
  JetBrains_Mono: () => ({ variable: '--font-mono', className: '' }),
}))

vi.mock('@/lib/stellar-helper', () => ({
  stellar: {
    connectWallet: vi.fn().mockResolvedValue('GTEST...1234'),
    disconnect: vi.fn(),
    getBalance: vi.fn().mockResolvedValue({ xlm: '100', cached: false }),
    sendPayment: vi.fn().mockResolvedValue({ hash: 'testhash', success: true }),
    getExplorerLink: vi.fn((h, t) => `https://stellar.expert/testnet/${t}/${h}`),
    formatAddress: vi.fn(a => a.slice(0, 4) + '...' + a.slice(-4)),
    formatXLM: vi.fn(s => (s / 10_000_000).toFixed(2)),
  },
  WalletNotFoundError: class extends Error { name = 'WalletNotFoundError' },
  WalletRejectedError: class extends Error { name = 'WalletRejectedError' },
  InsufficientBalanceError: class extends Error { name = 'InsufficientBalanceError' },
  ContractError: class extends Error { name = 'ContractError' },
  CampaignExpiredError: class extends Error { name = 'CampaignExpiredError' },
}))

vi.mock('@/lib/contract-client', () => ({
  createFundClient: vi.fn(() => ({
    createCampaign: vi.fn().mockResolvedValue('txhash123'),
    getAllCampaigns: vi.fn().mockResolvedValue({ campaigns: [], cached: false }),
    getDonations: vi.fn().mockResolvedValue({ donations: [], cached: false }),
    recordDonation: vi.fn().mockResolvedValue('txhash456'),
    getCampaignCount: vi.fn().mockResolvedValue(3),
  })),
  getProgressPercent: vi.fn((c) => Math.min(100, Math.round(c.raised / c.goal * 100))),
  getDaysLeft: vi.fn(() => 14),
  isExpired: vi.fn(() => false),
}))
