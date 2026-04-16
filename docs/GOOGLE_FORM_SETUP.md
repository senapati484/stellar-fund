# Google Form Setup Guide

## Overview
The Google Form is used for user onboarding in the StellarFund application. When users connect their wallet for the first time, they are prompted to fill out this form.

## Recommended Google Form Fields

### Section 1: User Information

| Field Name | Type | Description |
|------------|------|-------------|
| Email | Email | User's email address |
| Full Name | Text | User's full name |
| Wallet Address | Text (read-only/copy) | User's Stellar wallet public key (GB...) |

### Section 2: Experience & Preferences

| Field Name | Type | Options |
|------------|------|---------|
| Familiarity with Stellar | Multiple Choice | Beginner, Intermediate, Advanced, Expert |
| Interest in StellarFund | Multiple Choice | Investing in campaigns, Creating campaigns, Both |
| How did you find us? | Multiple Choice | Social media, Friend/Family, Search engine, Other |

### Section 3: Feedback (Optional)

| Field Name | Type | Description |
|------------|------|-------------|
| What features would you like to see? | Paragraph | Open text for suggestions |
| Any other comments? | Paragraph | Additional feedback |

---

## How to Create the Google Form

### Step 1: Go to Google Forms
Navigate to [forms.google.com](https://forms.google.com) and sign in with your Google account.

### Step 2: Create a New Form
1. Click **+ New form** or **Blank**
2. Title: `StellarFund User Survey` (or your preferred name)
3. Description: `Help us understand our community better!`

### Step 3: Add Fields
Add the fields listed above in the "Recommended Fields" section.

### Step 4: Configure Settings
1. Click the **Settings** tab (top)
2. Enable **Collect email addresses** (optional, if not using as a separate field)
3. Set **Responses** → **Shuffle question order** (optional)

### Step 5: Get the Form URL
1. Click the **Send** button (top right)
2. Copy the generated link
3. Update `.env.local` with the URL:

```bash
NEXT_PUBLIC_GOOGLE_FORM_URL=https://forms.gle/YOUR_FORM_ID
```

---

## Testing the Form

After creating the form:
1. Fill out the form yourself to test
2. Check Google Sheets for responses
3. Verify the link works in the app (run `npm run dev` and connect wallet)

---

## Notes
- The form is opened in a new tab when users dismiss the onboarding banner
- No data from this form is stored on-chain - it's purely for user feedback
- You can add/remove fields based on your needs
- Consider adding a "Terms and Conditions" checkbox if needed