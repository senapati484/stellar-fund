# Stellar Fund - Testing & Implementation Guide

## Quick Start

### Prerequisites
- Node.js 18+ installed
- Freighter wallet browser extension
- Stellar testnet account with at least 10 XLM
- Environment variables configured (see `.env.example`)

### Installation
```bash
npm install
npm run dev
```

Visit `http://localhost:3000` to see the application.

---

## Task 1: Contract Client Testing

### What Was Fixed
The `createCampaign()` and `recordDonation()` methods now properly:
1. Simulate transactions before submission
2. Extract soroban data from simulation
3. Calculate proper fees
4. Handle errors gracefully

### Testing the Fixes

#### Test 1: Campaign Creation Flow
**Steps:**
1. Start the dev server: `npm run dev`
2. Connect your Freighter wallet
3. Navigate to "Create Campaign"
4. Fill in campaign details:
   - Title: "Test Campaign"
   - Description: "This is a test campaign to verify contract integration"
   - Goal: 5 XLM
   - Duration: 7 days
5. Review and click "Launch Campaign 🚀"

**Expected Behavior:**
- ✅ Progress indicator shows "Building transaction…"
- ✅ After ~2 seconds: "Waiting for wallet signature…"
- ✅ Freighter wallet opens for signing
- ✅ After signing: "Broadcasting to network…"
- ✅ Then: "Confirming on-chain…"
- ✅ Finally: "Confirmed!" with transaction hash
- ✅ No buttons disappear during the process
- ✅ Error messages are clear if something fails

**What's Happening:**
1. Transaction is built with contract call
2. Transaction is simulated to get fees and soroban data
3. Fresh account data is fetched for proper sequence number
4. Final transaction is built with soroban data
5. Transaction is signed and submitted

#### Test 2: Donation Recording
**Steps:**
1. Find an active campaign (or create one)
2. Click "Donate to this campaign"
3. Enter donation amount (e.g., 1 XLM)
4. Add optional message
5. Click "Send Donation"

**Expected Behavior:**
- ✅ Same progress flow as campaign creation
- ✅ Success confirmation with transaction hash
- ✅ Campaign's raised amount updates (after refresh)

#### Test 3: Error Handling
**Steps:**
1. Try to create campaign with invalid parameters
2. Try to donate more than you have
3. Try to donate with insufficient funds

**Expected Behavior:**
- ✅ Clear error messages explain what went wrong
- ✅ Progress shows "error" stage
- ✅ User can retry without refreshing

---

## Task 2: UI Theme Testing

### What Was Fixed
- Claude AI theme colors applied throughout
- Button visibility fixed (no disappearing buttons)
- Proper spacing and responsive layout
- Accessibility improvements

### Testing Color Palette
**Primary Colors:**
- Dark text: #1A1A1A (claude-dark)
- Medium-dark: #2D2D2D (claude-medium-dark)  
- Medium gray: #555555 (claude-medium)
- Light gray: #888888 (claude-light)
- Lighter gray: #BBBBBB (claude-lighter)
- Primary accent: #D97450 (Claude Orange)

**Test Steps:**
1. Open browser DevTools (F12)
2. Navigate through the app
3. Check that all text uses the correct colors:
   - Headings: #1A1A1A
   - Body text: #555555
   - Hints/muted: #888888
   - Links: #D97450

### Testing Button Visibility
**Test 1: Duration Buttons**
1. Go to Create Campaign → Step 2
2. Click each duration button (7, 14, 30, 60 days)

**Expected:**
- ✅ Button background changes to orange when selected
- ✅ Button remains fully visible
- ✅ Text is white when selected, dark when not
- ✅ Smooth hover effects

**Test 2: Navigation Buttons**
1. Go through all campaign creation steps
2. Hover, click, and disable buttons

**Expected:**
- ✅ Buttons remain visible in all states
- ✅ Hover state: slightly darker orange
- ✅ Active state: darker orange with slight elevation
- ✅ Disabled state: faded with different cursor

**Test 3: Step Indicator**
1. Look at the step indicator at top of form

**Expected:**
- ✅ Large, clear circles (40px)
- ✅ Completed steps show green (#059669) with checkmark
- ✅ Current step shows orange (#D97450)
- ✅ Future steps show light gray
- ✅ Labels visible on desktop, hidden on mobile

### Testing Spacing
**Test Steps:**
1. Create a campaign and observe spacing

**Expected:**
- ✅ 24px (1.5rem) between major sections
- ✅ 12px (0.75rem) between form fields
- ✅ 16px (1rem) padding in cards
- ✅ Consistent mobile spacing

### Testing Responsive Design
**Mobile (< 640px):**
1. Open DevTools → Device toolbar
2. Select iPhone SE (375px width)
3. Go through campaign creation

**Expected:**
- ✅ Single column layout
- ✅ Full-width buttons
- ✅ Step labels hidden, numbers visible
- ✅ No horizontal scrolling
- ✅ Touch targets at least 44px tall

**Tablet (768px):**
1. Set viewport to 768px width

**Expected:**
- ✅ Improved spacing
- ✅ Step labels visible
- ✅ Better use of horizontal space

**Desktop (1200px+):**
1. Full desktop view

**Expected:**
- ✅ Maximum width respected
- ✅ Proper centering
- ✅ Optimal spacing

### Testing Accessibility
**Focus Visible Test:**
1. Press Tab key repeatedly
2. Navigate through form without mouse

**Expected:**
- ✅ Blue focus outline visible on all interactive elements
- ✅ Clear focus indicator on buttons
- ✅ Proper tab order (left to right, top to bottom)

**Color Contrast Test:**
1. Use browser DevTools accessibility checker
2. Or use https://webaim.org/resources/contrastchecker/

**Expected:**
- ✅ All text meets WCAG AA standard (4.5:1 for normal text)
- ✅ Buttons have sufficient contrast

---

## Task 3: Component Testing

### CreateCampaignForm Testing

#### Step 1: Campaign Details
**Test:**
1. Navigate to Create Campaign
2. Try to proceed without filling fields

**Expected:**
- ✅ Error messages appear below each invalid field
- ✅ Title error: "Title must be at least 3 characters"
- ✅ Description error: "Description must be at least 20 characters"
- ✅ Character counters show (e.g., "25/80")

**Test:**
1. Fill in valid details
2. Click "Next: Funding Goal →"

**Expected:**
- ✅ Smooth animation to Step 2
- ✅ Form data preserved (not lost)
- ✅ Step indicator updates

#### Step 2: Funding Goal
**Test:**
1. Try invalid amounts: 0, negative, > 1,000,000

**Expected:**
- ✅ Error: "Goal must be greater than 0"
- ✅ Error: "Goal must be less than 1,000,000 XLM"

**Test:**
1. Enter valid goal: 10 XLM
2. Click duration buttons

**Expected:**
- ✅ Stroops conversion shows: "= 100,000,000 stroops"
- ✅ Duration button highlights properly
- ✅ Deadline date calculates and displays

**Test:**
1. Toggle "Cap donations at goal" checkbox

**Expected:**
- ✅ Checkbox state saves
- ✅ Checkbox styled with orange accent color
- ✅ Explanation text shows below checkbox

#### Step 3: Review & Launch
**Test:**
1. Review all displayed information
2. Click "Edit" button

**Expected:**
- ✅ Goes back to Step 2
- ✅ Previous input preserved
- ✅ Can click "← Back" to go to Step 1

**Test:**
1. Review information looks correct
2. Click "🚀 Launch Campaign"

**Expected:**
- ✅ Progress stepper appears
- ✅ Transaction flow works as tested in Task 1

### UI Component Testing

#### Input Component
**Test:**
1. Create new campaign form
2. Click on title input

**Expected:**
- ✅ Orange focus ring appears
- ✅ Placeholder text is light gray
- ✅ Character counter displays correctly

#### Textarea Component
**Test:**
1. Click on description textarea
2. Type and watch character counter

**Expected:**
- ✅ Orange focus ring
- ✅ Can resize on desktop
- ✅ Character counter updates live
- ✅ Counter turns red when >90% full

#### Button Component
**Test:** Each button variant
1. Primary: "Launch Campaign 🚀" → Orange, full opacity
2. Secondary: "← Back" → White with border, less prominent
3. Ghost: "View on Explorer →" → Transparent, orange text
4. Success: Not currently used, but test if present
5. Danger: Not currently used, but test if present

**Expected:**
- ✅ Each variant has distinct appearance
- ✅ Hover states are clear
- ✅ Active states provide feedback
- ✅ Disabled state is obviously disabled

---

## Manual Testing Checklist

### Pre-Launch Verification
- [ ] All buttons visible in all states
- [ ] No text is cut off or overlapping
- [ ] Colors match Claude AI theme
- [ ] Spacing is consistent
- [ ] Mobile layout works
- [ ] Focus states visible
- [ ] Error messages clear and helpful

### Contract Integration
- [ ] Campaign creation completes successfully
- [ ] Campaign ID is returned and displayed
- [ ] Donation to campaign works
- [ ] Failed transactions show error messages
- [ ] Network errors are handled gracefully
- [ ] Progress shows all stages

### Form Validation
- [ ] Title validation works (3-80 chars)
- [ ] Description validation works (20-500 chars)
- [ ] Goal validation works (> 0, < 1,000,000)
- [ ] Duration validation works (7-60 days)
- [ ] Error messages appear for invalid input
- [ ] Success message appears after submission

### Responsive Design
- [ ] Mobile (320px) - no horizontal scroll
- [ ] Tablet (768px) - proper layout
- [ ] Desktop (1200px+) - optimal spacing
- [ ] Touch targets at least 44px
- [ ] Buttons full width on mobile

---

## Debugging Guide

### Issue: Campaign creation fails with "No soroban data"

**Cause:** Simulation didn't return soroban data (contract may not exist or network issue)

**Solution:**
1. Check `NEXT_PUBLIC_CONTRACT_ID` is correct
2. Verify contract is deployed on Stellar testnet
3. Check network connectivity
4. Try again after a few seconds

### Issue: Buttons disappear when clicked

**This should NOT happen after fixes!**

If it does:
1. Check globals.css has `overflow: visible` on `.claude-button`
2. Verify button component isn't using `overflow: hidden`
3. Check z-index isn't causing layering issues

### Issue: Colors don't match Claude theme

**Cause:** CSS variables not loading or Tailwind not configured

**Solution:**
1. Check app/globals.css has :root section with CSS variables
2. Verify tailwind.config.ts has extended colors
3. Check no conflicting Tailwind utilities are overriding
4. Do hard refresh (Ctrl+Shift+R or Cmd+Shift+R)

### Issue: Mobile layout broken

**Cause:** Responsive classes not working

**Solution:**
1. Check responsive breakpoints in tailwind.config.ts
2. Verify use of `sm:`, `md:`, `lg:` prefixes
3. Check container isn't too wide (max-width needed)
4. Test with real device (DevTools sometimes differ)

### Issue: Focus ring not visible

**Cause:** Focus visible styles not applied

**Solution:**
1. Check CSS has `.focus-visible` selectors
2. Verify outline isn't being hidden by other styles
3. Check outline-offset is set (2px recommended)
4. May need to use :focus-within for containers

---

## Performance Testing

### Lighthouse Audit
1. Open DevTools → Lighthouse tab
2. Run "Generate report"

**Target Scores:**
- Performance: > 90
- Accessibility: > 95
- Best Practices: > 95
- SEO: > 90

### Transaction Speed
**Baseline times:**
- Build transaction: < 100ms
- Simulate: 1-3 seconds (network dependent)
- Sign (user delay): varies
- Submit: 2-5 seconds
- Confirm: 10-60 seconds (network dependent)

### Bundle Size
```bash
npm run build
```

Check:
- Next.js bundle is reasonable
- No duplicate dependencies
- Tree-shaking is working

---

## Next Steps After Testing

1. **Deploy to staging:** Test on actual Stellar testnet
2. **User testing:** Have non-technical users try the flow
3. **Mobile testing:** Test on actual phones
4. **Cross-browser:** Test on Chrome, Firefox, Safari, Edge
5. **Performance:** Monitor transaction times in production
6. **Monitoring:** Set up error tracking (Sentry or similar)

---

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Buttons disappear | Check `overflow: visible` in CSS |
| Wrong colors | Hard refresh, check CSS variables |
| Mobile broken | Check responsive classes, test device |
| Transaction fails | Check contract ID, verify testnet |
| Focus not visible | Check focus-visible CSS, outline-offset |
| Slow transactions | Network dependent, normal on testnet |
| Form errors wrong | Check validation logic in component |

---

## Support

For issues or questions:
1. Check browser console for errors (F12)
2. Check network tab for failed requests
3. Check environment variables are set
4. Review error messages for hints
5. Check Stellar documentation for contract info
