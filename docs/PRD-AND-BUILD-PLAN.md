# PRD & Build Plan — Keep in Memory

## PRD highlights

- **11:30 AM** is the critical dependency. Person 4 delivering Scenario 1 to Person 3A at that time is the only dependency that can block multiple people. Everything else is parallel.
- **Person 3B** is the highest-risk role technically. The audio sequencer (chaining dialogue, narration, key phrase repetition, reflection question with correct pauses) is fiddly. Put the strongest **frontend JavaScript** person there, not necessarily the strongest overall developer.
- **Ethics slide** is the differentiator. Most teams won’t have thought through why they chose their tools. Judges scoring **Criterion 3 (Cultural Relevance)** will remember the team that said “we deliberately didn’t use Whisper, and here’s why.” That’s a 9, not a 7.

---

## Person 3A — Remaining work (reflection questions)

**Own:** Claude reflection-question side — **not** the audio pipeline.

1. Take Person 4’s final scenario scripts and write or generate **1 reflection question per scenario** (4 total).
2. Each question must be:
   - **Max 10 words**
   - **Beginner English**
   - **Encouraging**
   - **Spoken naturally** (sounds good when read aloud)
   - **No jargon**
3. Deliver the **final 4 questions** so they can be dropped into `src/pipeline/scenarios.js` (field: `reflectionQuestion` per scenario).
4. If there’s time: set up the Claude API call so the hardcoded questions can later be replaced with generated ones.
5. After that: help Person 5 explain the technical architecture in the pitch.

**Person 3A does NOT touch:**  
Web Speech API, play button logic, audio sequencing, “Got it” / replay buttons, tree completion wiring.

### Handoff message for Person 3A

> Can you take over 3A? I already built the 3B audio pipeline and demo flow. I need you to own the reflection-question side: review Person 4’s scripts, produce 4 final reflection questions that are **max 10 words**, **beginner English**, **encouraging**, and **natural when spoken aloud**. If time allows, set up the Claude API call for those questions, but the first priority is delivering the 4 clean questions so I can plug them into `scenarios.js`.

### Priority split

| Priority   | Task |
|-----------|------|
| **Must-have** | Write/finalize the 4 reflection questions |
| **Nice-to-have** | Claude API route for generated questions |
| **Extra if ahead** | Help with judge-facing technical explanation |

---

## Where the 4 questions go

File: **`src/pipeline/scenarios.js`**

Each scenario object has a `reflectionQuestion` field. The four scenarios (and current placeholder questions) are:

| Scenario id              | Title                         | Current `reflectionQuestion` |
|--------------------------|-------------------------------|------------------------------|
| `greeting-resident`      | Greeting a New Resident       | "What would you say to help a nervous resident feel safe?" |
| `resident-refuses-help`  | Responding With Patience      | "What can you say when a resident says no?" |
| `talking-to-supervisor`  | Talking to Your Supervisor    | "How would you ask your supervisor for help clearly?" |
| `small-emergency`        | Handling a Small Emergency    | "What would you say to keep someone calm?" |

Person 3A should replace these with final versions that meet: max 10 words, beginner English, encouraging, natural when spoken, no jargon.
