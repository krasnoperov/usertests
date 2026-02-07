# PRD-04: JTBD Agentic Interviewer

## Overview

The intelligence layer that conducts Jobs-to-be-Done interviews. This agent manages prompts, phase transitions, probing strategies, and real-time signal detection to create interviews that feel like talking to a skilled human researcher - curious, empathetic, and able to uncover the "why" behind user decisions.

---

## User Problem

Product teams struggle to understand why users make decisions. Traditional surveys capture what users do, but miss the deeper motivations, frustrations, and emotional triggers that drive behavior. Conducting quality JTBD interviews requires specialized training and is time-intensive, making it impractical to gather these insights at scale.

This agent solves the problem by automating skilled JTBD interviewing, allowing teams to:
- Uncover the "job" users are hiring the product to do
- Understand the forces that drive switching decisions
- Capture emotional moments and specific quotes that inform product decisions
- Scale qualitative research without sacrificing depth

---

## Key Features

- Adaptive interview flow that responds to user engagement levels
- Real-time detection of JTBD signals during conversation
- Natural probing when users give vague or surface-level answers
- Automatic phase transitions based on time and signal saturation
- Gentle redirection of tangents without disrupting rapport
- Quality scoring to measure interview effectiveness
- Context management that maintains conversation coherence

---

## Interview Phases

### 1. Building Rapport
**Goal:** Make the user comfortable and understand their basic context

### 2. First Thought
**Goal:** Find the moment they first realized they needed something - the trigger event

### 3. Passive Looking
**Goal:** Understand what they noticed before actively searching and what pushed them to take action

### 4. Active Looking
**Goal:** Map their search process - where they looked, what they considered, what they ruled out

### 5. Deciding Moment
**Goal:** Understand the actual decision, what sealed the deal, and what tradeoffs they made

### 6. First Use & Current Use
**Goal:** Explore their experience using the solution, what works, what doesn't, and what workarounds they use

### 7. Wrap Up
**Goal:** Capture final insights and thank the participant

---

## Signal Types

The agent detects and records six types of JTBD signals:

### Struggling Moment
Frustration, confusion, or difficulty with a task. Indicates pain points and unmet needs.

### Desired Outcome
What the user wants to achieve - the "job" they're hiring the product to do.

### Hiring Criteria
Specific reasons for choosing this solution over alternatives. Reveals competitive differentiators.

### Firing Moment
Conditions that would make them stop using the solution. Indicates churn risks and must-have features.

### Workaround
Hacks or alternative approaches users employ. Reveals product gaps and opportunities.

### Emotional Response
Strong positive or negative reactions. Indicates high-stakes moments and memorable experiences.

---

## Success Criteria

### Interview Quality
- Extract at least 5 high-confidence signals per interview
- Maintain user-to-agent talk ratio of 3:1 or higher
- Complete all 7 phases within target session duration
- Average signal confidence score above 0.7

### User Experience
- Users report feeling heard and understood
- Natural conversation flow with minimal awkward pauses
- Successful redirect of tangents without breaking rapport

### Business Impact
- Insights lead to actionable product decisions
- Signal patterns emerge across multiple interviews
- Reduction in time spent on manual qualitative research

---

## Dependencies

### Requires (from other PRDs)
- **PRD-01 (Interview System):** Session management and message flow (MVP: HTTP text chat)
- **PRD-02 (Recording Pipeline):** Audio and interaction capture during interviews

### Provides (to other PRDs)
- **PRD-03 (Analytics):** Extracted signals, phase transitions, quality metrics
- **PRD-05 (Tasks):** Signals with suggested tasks based on findings
