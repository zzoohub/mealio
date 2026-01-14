# Design Process

Step-by-step guide for designing user flows and screens.

---

## Step 1: Define the Goal

Before any design work, answer these questions:

### User Intent
- What is the user trying to accomplish?
- What triggered them to be here? (entry point context)
- What does success look like from their perspective?

### User Context
- What environment are they in? (commuting, working, relaxing)
- What's their mental state? (focused, distracted, stressed)
- What time pressure do they have? (quick task vs. deep work)

### Information Needs
- What's the minimum information user needs to proceed?
- What can be deferred to later steps?
- What assumptions can we make (and auto-fill)?

---

## Step 2: Map the Critical Path

### Find the Shortest Route
1. List every step from entry to goal completion
2. For each step, ask: "Is this necessary?"
3. Remove or combine steps where possible
4. Identify steps that can happen in background

### Design for Happy Path First
- 80% of users should have frictionless experience
- Edge cases handled, but not at the cost of main flow
- Error states designed after happy path is solid

### Map Decision Points
```
Entry → [Decision A] → Action 1 → [Decision B] → Action 2 → Success
              ↓                          ↓
         Alt Path 1                 Alt Path 2
```

For each decision point:
- What information does user need to decide?
- Can we reduce options? (see Hick's Law)
- Can we recommend a default?

---

## Step 3: Design Each Screen

### Screen Anatomy
```
┌─────────────────────────────┐
│  Context (where am I?)      │
├─────────────────────────────┤
│                             │
│  Information                │
│  (what do I need to know?)  │
│                             │
├─────────────────────────────┤
│  Primary Action             │
│  (what should I do?)        │
├─────────────────────────────┤
│  Secondary Actions          │
│  (what else can I do?)      │
└─────────────────────────────┘
```

### Per Screen Checklist
- [ ] ONE primary action (visually dominant)
- [ ] Information supports the decision at hand (nothing extra)
- [ ] User knows where they are in the flow
- [ ] Clear feedback when action is taken
- [ ] Exit path available (but not prominent)

### Content Hierarchy
1. What does user need FIRST? (put it at top)
2. What supports the main decision? (middle)
3. What's optional/secondary? (bottom or hidden)

---

## Step 4: Remove

After initial design, review and cut:

### Questions to Ask
- What can be removed without blocking the goal?
- What can be combined into fewer steps?
- What can be automated or defaulted?
- What can be deferred to "advanced" or "settings"?

### Common Removals
| Often Added | Usually Unnecessary |
|-------------|---------------------|
| Tutorial/onboarding | If UI is intuitive |
| Confirmation dialogs | For non-destructive actions |
| "Are you sure?" prompts | For reversible actions |
| Feature explanations | If labels are clear |
| Marketing in product | During task completion |

### The Test
> "If I remove this, does it block the user's goal?"
> 
> - If yes → keep it
> - If no → remove it
> - If unsure → test it

---

## Step 5: Validate

### Self-Review
Walk through the flow as a new user:
1. Do I know what to do at each step?
2. Is there anything confusing?
3. How many taps/clicks to complete?
4. What could go wrong?

### User Testing (Lightweight)
- 5 users find 85% of usability issues
- Watch, don't guide
- Note where users hesitate, backtrack, or ask questions

### Metrics to Track
| Metric | Indicates |
|--------|-----------|
| Completion rate | Flow clarity |
| Time on task | Efficiency |
| Drop-off points | Friction |
| Error rate | Confusion |
