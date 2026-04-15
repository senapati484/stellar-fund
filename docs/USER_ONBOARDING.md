# StellarFund — User Onboarding & Feedback System

## Overview
Level 5 requires 5+ real testnet users with documented feedback.
This guide covers setting up the Google Form, collecting responses,
and exporting to Excel for the README.

## Step 1: Create the Google Form

Go to forms.google.com → "Blank form"
Title: "StellarFund — User Registration & Feedback"
Description: "Thanks for trying StellarFund! This takes 30 seconds."

Add these 5 questions:

Question 1 — Short answer — REQUIRED
  Title: "Your Name"
  Placeholder: "First name or username"

Question 2 — Short answer — REQUIRED
  Title: "Email Address"
  Validation: Must be valid email

Question 3 — Short answer — REQUIRED
  Title: "Stellar Testnet Wallet Address"
  Description: "Starts with G, 56 characters. Get one free at freighter.app"
  Validation: Response must match pattern: G[A-Z2-7]{55}

Question 4 — Linear scale 1–5 — REQUIRED
  Title: "Rate StellarFund (1=Poor, 5=Excellent)"
  1 label: "Poor" / 5 label: "Excellent"

Question 5 — Paragraph — OPTIONAL
  Title: "What feature would you most like to see improved?"

Settings:
  ✓ Collect email addresses (auto, via Google sign-in)
  ✓ Limit to 1 response per person
  Theme: set to a warm color (#C96442 if available)

Click Send → Copy the shareable link.
Update NEXT_PUBLIC_GOOGLE_FORM_URL in .env.local

## Step 2: Export Responses to Excel

After collecting 5+ responses:
  Google Form → Responses tab
  Click the Google Sheets icon → Create a new spreadsheet
  File → Download → Microsoft Excel (.xlsx)
  Rename file: user-feedback.xlsx
  Place in repo root: /user-feedback.xlsx

## Step 3: Share the Form with Users

Scripts to get 5 users:

a) Post in Stellar Developer Discord (#projects channel):
   "Hey! I built StellarFund — on-chain crowdfunding on Stellar testnet.
    Would love 5 people to try it and give feedback!
    Live: [your Vercel URL]
    Form: [your Google Form URL]
    Takes < 5 minutes, testnet only (no real funds)"

b) Post in the Rise In bootcamp community channel

c) Share on Twitter/X:
   "Built a crowdfunding dApp on @Stellar Soroban testnet 🌟
    Create campaigns + donate XLM + withdraw on-chain
    Try it: [URL] | Feedback form: [form URL]
    #Stellar #Soroban #Web3"

d) DM 5 bootcamp cohort members directly

e) Create a campaign yourself and send the direct campaign URL
   to 5 friends — they only need to click Donate

## Step 4: Verify on Stellar Explorer

For each user's wallet address, verify on:
https://stellar.expert/explorer/testnet/account/[WALLET_ADDRESS]

You should see XLM transactions proving real testnet activity.

## Step 5: Document in README

Paste the 5 wallet addresses into README under "Verified Users" section.
Attach or link user-feedback.xlsx.
