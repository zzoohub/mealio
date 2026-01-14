# Cognitive Principles for UX

Use this reference when diagnosing why an interface feels wrong or when users struggle.

---

## Hick's Law

**The time to make a decision increases with the number and complexity of choices.**

### When to Apply
- User hesitates or freezes on a screen
- Conversion rates drop at decision points
- Users ask "what should I do here?"

### Solutions
- Reduce visible options (progressive disclosure)
- Group related choices
- Highlight recommended option
- Remove choices that <5% of users need

### Example
```
❌ Settings page with 40 options visible
✅ Settings grouped into 5 categories, each expandable
```

---

## Fitts's Law

**The time to reach a target is a function of distance and size.**

### When to Apply
- Users miss tap/click targets
- Important actions have low engagement
- Mobile users struggle with certain buttons

### Solutions
- Increase target size (minimum 44×44pt, prefer 48×48pt)
- Reduce distance to frequently used actions
- Place primary actions in thumb-friendly zones
- Add padding around small targets

### Example
```
❌ Small "X" button in corner to close modal
✅ Large "Close" button or tap-outside-to-dismiss
```

---

## Cognitive Load

**Working memory is limited. Every element competes for attention.**

### When to Apply
- Users feel overwhelmed
- Users miss important information
- Error rates increase on complex forms

### Solutions
- Show only information needed for current decision
- Break complex tasks into steps
- Use progressive disclosure
- Remove decorative elements
- Provide smart defaults

### Example
```
❌ Checkout form with 15 fields on one page
✅ 3-step checkout: Shipping → Payment → Review
```

---

## Goal Gradient Effect

**Motivation increases as people get closer to their goal.**

### When to Apply
- Users abandon multi-step processes
- Completion rates are low
- Users lose interest midway

### Solutions
- Show progress indicators
- Start progress bar at >0% (artificial advancement)
- Break large tasks into visible milestones
- Celebrate micro-completions

### Example
```
❌ 7-step form with no progress indicator
✅ "Step 3 of 4 - Almost done!"
```

---

## Peak-End Rule

**People judge experiences based on the peak moment and the ending, not the average.**

### When to Apply
- Users report negative experiences despite smooth flow
- NPS scores are lower than expected
- Users don't return after completing a task

### Solutions
- Identify and fix the most painful moment (peak negative)
- Create a delightful ending (confirmation, celebration)
- End on user's accomplishment, not your upsell

### Example
```
❌ After purchase: immediately show "You might also like..."
✅ After purchase: "You're all set! Order #123 confirmed." + clear next steps
```

---

## Miller's Law

**Average person can hold 7±2 items in working memory.**

### When to Apply
- Navigation has many top-level items
- Lists feel endless
- Users can't remember options from previous screen

### Solutions
- Limit navigation to 5-7 items
- Chunk information into groups of 3-5
- Use visual hierarchy to reduce perceived items
- Persist important context across screens

---

## Von Restorff Effect (Isolation Effect)

**Items that stand out are more likely to be remembered.**

### When to Apply
- Primary action doesn't get enough clicks
- Users miss important warnings
- Key information gets lost in the page

### Solutions
- Make ONE thing visually distinct per screen
- Use color, size, or position to isolate primary action
- Don't make everything "stand out" (nothing will)

### Example
```
❌ Three buttons: [Cancel] [Save Draft] [Publish] all same style
✅ [Cancel] [Save Draft] as text links, [Publish] as primary button
```
