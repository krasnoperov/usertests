# UserTests

**UserTests is a closed-loop user research platform that interviews users, extracts JTBD signals, prioritizes work, and autonomously implements improvements—then re-interviews to measure impact.**

The key differentiator: **insights don't sit in reports; they become deployed code.**

## How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Interview  │────▶│   Extract   │────▶│  Prioritize │────▶│  Implement  │
│    Users    │     │   Signals   │     │    Tasks    │     │    Code     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ▲                                                            │
       │                                                            │
       └────────────────── Re-interview to measure ─────────────────┘
```

1. **Interview** - AI conducts JTBD (Jobs-to-be-Done) voice interviews while capturing user interactions
2. **Extract** - Transcribe audio, correlate with behavior, identify struggle moments and desired outcomes
3. **Prioritize** - Cluster signals into tasks, rank by frequency/intensity/breadth
4. **Implement** - AI generates code fixes, creates PRs, deploys changes
5. **Measure** - Re-interview users to verify the problem was solved

## Documentation

- [System Plan](./SYSTEM_PLAN.md) - Architecture overview
- [PRDs](./docs/prd/) - Product requirements for each component

## Components

| Component | Description |
|-----------|-------------|
| Interview System | Real-time AI voice interviewer using JTBD methodology |
| Recording Pipeline | SDK capturing audio + user interactions |
| Analytics Engine | Transcription and signal extraction |
| Task Tracker | Signal clustering and prioritization |
| Implementation Harness | AI code generation and deployment |
| Screener & Recruitment | User qualification and scheduling |
| Analysis Dashboard | Insights visualization and data management |
