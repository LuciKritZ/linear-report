# Linear Ticket Consolidation CLI

A Node.js CLI that fetches your Linear tickets, filters them by month, and generates consolidated work summary reports (technical and non-technical). Only includes tickets you actually worked on (started, created, or commented).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure Linear**
   - Copy `.env.example` to `.env`
   - Add your Linear Personal API Key from [Linear Settings → API](https://linear.app/settings/api)
   - **If using a bot/integration API key:** Set `LINEAR_ASSIGNEE_EMAIL` to your account email to fetch tickets assigned to you
   ```bash
   cp .env.example .env
   # Edit .env:
   # LINEAR_API_KEY=lin_api_xxxx...
   # LINEAR_ASSIGNEE_EMAIL=you@company.com  # Required for bot keys
   ```

## Usage

### Generate report for previous month (with confirmation)
```bash
npm run start
# Prompts: "Generate report for 01. January 2026? (Y/n)"
```

### Skip confirmation (e.g. for automation)
```bash
npm run start -- --yes
# Uses previous month without prompting
```

### Generate report for specific month
```bash
npm run start -- --month 2026-01
# or
npm run start -- --month 01-2026
```

### Custom output directory
```bash
npm run start -- --month 2026-01 --output ./reports
```

### Help
```bash
npm run start -- --help
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LINEAR_API_KEY` | Yes | Linear Personal API Key from [Settings → API](https://linear.app/settings/api) |
| `LINEAR_ASSIGNEE_EMAIL` | No | Your Linear email. **Required** when using a bot/integration API key to fetch tickets assigned to you |

## Output

Reports are saved to:
```
generated/
└── 02. February/
    └── 2026-02-04 14:30/
        ├── 20260204_143022_123_technical.txt
        └── 20260204_143022_123_non_technical.txt
```

- **Technical summary**: Ticket IDs (e.g. PER-49), status, labels, implementation details
- **Non-technical summary**: Business outcomes, high-level features, plain language

## Filtering Logic

Tickets are included only if you **actually worked on them** in the month:
- **Started** – You moved the ticket to a started state (`startedAt` in month)
- **Created** – You created the ticket
- **Commented** – You left at least one comment in the month

Tickets in Triage (or any status) are included only if you commented on them; assignment alone is not enough.

## Scripts

- `npm run start` – Run the CLI (uses tsx)
- `npm run build` – Compile TypeScript
- `npm run test` – Run unit tests

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `LINEAR_API_KEY is not set` | Add `LINEAR_API_KEY` to `.env` (see `.env.example`) |
| `Failed to fetch Linear tickets` | Check API key validity; ensure `LINEAR_ASSIGNEE_EMAIL` is set if using a bot key |
| No tickets found | Verify you have tickets assigned to you with activity (started/commented) in the selected month |
| `Output directory cannot contain ".."` | Use a path without `..` (path traversal is blocked for security) |

## Requirements

- Node.js 18+
- Linear account with Personal API Key
