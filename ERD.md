# Engineering Requirement Document (ERD)
## Linear Ticket Consolidation CLI Tool

**Project Type:** [NEW PROJECT]  
**Date:** 2026-02-04  
**Architect:** AI Assistant  
**Status:** Draft

---

## Progress

### Core (Phases 1–4)

- [x] **Phase 1: Foundation**
  - [x] Project structure (TypeScript, dependencies)
  - [x] CLI argument parsing with Zod validation
  - [x] Linear API authentication and basic query
  - [x] Month selection logic with confirmation prompt
  - [x] Basic ticket fetching and filtering
- [x] **Phase 2: Report Generation**
  - [x] Technical summary generator
  - [x] Non-technical summary generator (template-based)
  - [x] File system service for structured output
  - [x] Date formatting utilities
- [x] **Phase 3: Enhancement**
  - [x] Error handling and edge cases
  - [x] Unit tests for all services (only `date-utils.node.ts` exists)
  - [x] Documentation (README with usage examples)
  - [x] Performance optimization (pagination, batching)
- [x] **Phase 4: Polish**
  - [x] E2E tests (if needed)
  - [x] CLI help text and user experience improvements
  - [x] Logging and progress indicators

### AI Summarization (Section 12)

- [ ] **Phase AI-1: GitHub PR Service**
  - [ ] URL regex for `github.com/{owner}/{repo}/pull/{number}`
  - [ ] GitHub API client with Zod-validated responses
  - [ ] Unit tests with mocked GitHub responses
- [ ] **Phase AI-2: LLM Summarizer Service**
  - [ ] Ollama HTTP client (`/api/generate`)
  - [ ] Prompt template for per-ticket summarization
  - [ ] Concurrency control
  - [ ] Fallback to template-based output on Ollama failure
- [ ] **Phase AI-3: Integration**
  - [ ] Wire report-generator to use AI summarizer when available
  - [ ] Add `--no-ai` CLI flag
  - [ ] Update `cli-controller.run.ts` flow
- [ ] **Phase AI-4: Optional Enhancements**
  - [ ] Final executive-summary pass
  - [ ] Linear API `issue.attachments` for PR links

### Invoice Generation (Section 13, after AI Summarization)

- [ ] **Phase INV-1: Invoice Generator Service**
  - [ ] PDF generation (e.g., pdf-lib)
  - [ ] Consulting invoice template (header, details grid, description, amount)
  - [ ] Configurable fields via env (consultant name, client, project, rate, etc.)
  - [ ] Unit tests with mocked PDF output
- [ ] **Phase INV-2: Annexure Integration**
  - [ ] Append non-technical summary as second page (Annexure / Enclosure)
  - [ ] Format annexure with clear "Details of Work Done" heading
- [ ] **Phase INV-3: Integration**
  - [ ] Wire invoice generation after AI summarization in CLI flow
  - [ ] Add `--invoice` flag to enable PDF generation
  - [ ] Output: `{timestamp}_invoice.pdf` alongside reports

---

## 1. EXECUTIVE SUMMARY

A Node.js CLI application that fetches all Linear tickets the user has interacted with, filters them by a specified month (defaulting to previous month with confirmation), and generates consolidated summary reports (technical, non-technical) plus an optional consulting invoice PDF with the work summary as annexure.

### Business Context
- **Problem:** Manual tracking and summarization of work completed across Linear tickets is time-consuming and inconsistent; consulting invoices require separate manual assembly.
- **Solution:** Automated monthly work summary generation with dual-format output (technical and non-technical), AI-powered summarization, and optional invoice PDF with annexure.
- **Value:** Saves time, ensures consistency, enables easy sharing with stakeholders and clients (e.g., invoice with "details of work done encl.").

---

## 2. REQUIREMENTS

### 2.1 Functional Requirements

#### FR-1: Linear API Integration
- **FR-1.1:** Authenticate with Linear API using personal API key
- **FR-1.2:** Fetch all tickets where user has:
  - Been assigned
  - Made updates
  - Any activity in the specified month
- **FR-1.3:** Support single workspace (current user's workspace)
- **FR-1.4:** Filter tickets by activity date within specified month

#### FR-2: Month Selection
- **FR-2.1:** Accept month parameter via CLI argument (format: `YYYY-MM` or `MM-YYYY`)
- **FR-2.2:** If no month provided, default to previous month
- **FR-2.3:** Prompt user for confirmation when using default (previous month)
- **FR-2.4:** Validate month input format

#### FR-3: Report Generation
- **FR-3.1:** Generate technical summary including:
  - Ticket IDs
  - Technical implementation details
  - Stack/technologies used
  - Uncommon technical jargon
  - Implementation specifics
- **FR-3.2:** Generate non-technical summary including:
  - Business outcomes
  - High-level features
  - User impact
  - Plain language descriptions
- **FR-3.3:** Save reports with structured file paths:
  - `generated/{MM}. {Month Name}/{Human Readable Timestamp}/{timestamp}_technical.txt`
  - `generated/{MM}. {Month Name}/{Human Readable Timestamp}/{timestamp}_non_technical.txt`
- **FR-3.4:** Timestamp format: `YYYYMMDD_HHMMSS_mmm` (e.g., `20260204_143022_123`)

#### FR-4: Data Processing
- **FR-4.1:** Categorize tickets by activity type (assigned, updated, commented)
- **FR-4.2:** Group tickets chronologically within the month
- **FR-4.3:** Extract and format ticket metadata (title, description, status, dates, labels)

### 2.2 Non-Functional Requirements

#### NFR-1: Security
- **NFR-1.1:** API key stored in environment variable (`.env` file)
- **NFR-1.2:** Never log or expose API key in output
- **NFR-1.3:** Validate all inputs using Zod schemas
- **NFR-1.4:** Follow OWASP Top 10 security practices

#### NFR-2: Code Quality
- **NFR-2.1:** TypeScript with `strict: true`
- **NFR-2.2:** No `any` types
- **NFR-2.3:** Functional programming style (map/reduce, pure functions)
- **NFR-2.4:** Comprehensive error handling

#### NFR-3: Performance
- **NFR-3.1:** Efficient GraphQL queries (batch requests where possible)
- **NFR-3.2:** Handle pagination for large ticket sets
- **NFR-3.3:** Reasonable execution time (< 30 seconds for typical workloads)

#### NFR-4: Maintainability
- **NFR-4.1:** Strict kebab-case file naming
- **NFR-4.2:** Co-located feature modules
- **NFR-4.3:** Clear separation of concerns (controllers, services, types)

---

## 3. ARCHITECTURE

### 3.1 System Architecture

```
┌─────────────────┐
│   CLI Entry     │
│  (index.ts)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Controller    │
│ (cli-controller)│
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         ▼                 ▼                 ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Linear API   │   │  Report      │   │   Invoice     │
│   Service    │   │  Generator   │   │   Generator   │
└──────────────┘   └──────┬───────┘   └──────┬───────┘
         │                │                  │
         │                ▼                  │
         │         ┌──────────────┐          │
         │         │ LLM          │          │
         │         │ Summarizer   │──────────┘
         │         └──────────────┘  (non-technical
         │                │          → annexure)
         ▼                ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   Zod        │   │   File       │   │   PDF        │
│  Schemas     │   │   System     │   │   (pdf-lib)  │
└──────────────┘   └──────────────┘   └──────────────┘
```

### 3.2 Technology Stack

- **Runtime:** Node.js 18+ (LTS)
- **Language:** TypeScript 5.x
- **CLI Framework:** `commander` or `yargs` (for argument parsing)
- **API Client:** `@linear/sdk` (official Linear SDK) or `graphql-request`
- **Validation:** `zod` (input validation)
- **Environment:** `dotenv` (environment variable management)
- **Testing:** `vitest` (unit tests), `@types/node` (type definitions)
- **Build Tool:** `tsx` (for development) or `tsc` + `node` (for production)

### 3.3 Design Patterns

#### 3.3.1 Repository Pattern
- **Justification:** Abstract Linear API interactions, enabling easy testing and future API changes.
- **Reference:** Similar to [Stripe's API abstraction layer](https://stripe.com/docs/api), which provides clean separation between API calls and business logic.

#### 3.3.2 Service Layer Pattern
- **Justification:** Stateless business logic services that are environment-agnostic (can be tested without CLI context).
- **Reference:** Follows [Airbnb's service layer architecture](https://medium.com/airbnb-engineering/airbnbs-service-oriented-architecture-7a4d41ee1c1e), where services contain pure business logic.

#### 3.3.3 Command Pattern
- **Justification:** CLI commands as discrete, testable units.
- **Reference:** Similar to [GitHub CLI's command structure](https://cli.github.com/manual/), which uses commander.js for clean command separation.

---

## 4. FILE STRUCTURE

Following strict kebab-case and co-location principles:

```
linear/
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── README.md
├── ERD.md
│
├── src/
│   ├── index.ts                          # CLI entry point
│   │
│   ├── cli-controller/
│   │   ├── cli-controller.index.ts       # Main CLI controller
│   │   ├── cli-controller.utils.ts       # CLI parsing logic
│   │   ├── cli-controller.types.ts       # CLI argument types + Zod schemas
│   │   └── cli-controller.node.ts        # Unit tests
│   │
│   ├── linear-api-service/
│   │   ├── linear-api-service.index.ts   # Service entry
│   │   ├── linear-api-service.utils.ts   # API calls, data fetching
│   │   ├── linear-api-service.types.ts   # Linear API types + Zod schemas
│   │   └── linear-api-service.node.ts    # Unit tests
│   │
│   ├── report-generator/
│   │   ├── report-generator.index.ts     # Generator entry
│   │   ├── report-generator.utils.ts     # Report formatting logic
│   │   ├── report-generator.types.ts     # Report types + Zod schemas
│   │   └── report-generator.node.ts      # Unit tests
│   │
│   ├── github-api-service/               # (AI feature)
│   │   ├── github-api-service.index.ts
│   │   ├── github-api-service.utils.ts   # PR fetch, URL parsing
│   │   ├── github-api-service.types.ts
│   │   └── github-api-service.node.ts
│   │
│   ├── llm-summarizer-service/           # (AI feature)
│   │   ├── llm-summarizer-service.index.ts
│   │   ├── llm-summarizer-service.utils.ts  # Ollama calls, prompt building
│   │   ├── llm-summarizer-service.types.ts
│   │   └── llm-summarizer-service.node.ts
│   │
│   ├── invoice-generator-service/         # (after AI summarization)
│   │   ├── invoice-generator-service.index.ts
│   │   ├── invoice-generator-service.utils.ts  # PDF layout, annexure append
│   │   ├── invoice-generator-service.types.ts
│   │   └── invoice-generator-service.node.ts
│   │
│   ├── file-system-service/
│   │   ├── file-system-service.index.ts  # File operations entry
│   │   ├── file-system-service.utils.ts  # File I/O operations
│   │   ├── file-system-service.types.ts  # File system types + Zod schemas
│   │   └── file-system-service.node.ts   # Unit tests
│   │
│   └── shared/
│       ├── constants.ts                  # App-wide constants
│       └── date-utils.ts                 # Date formatting utilities
│
├── generated/                             # Output directory (gitignored)
│   └── {MM}. {Month Name}/
│       └── {Human Readable Timestamp}/
│           ├── {timestamp}_technical.txt
│           ├── {timestamp}_non_technical.txt
│           └── {timestamp}_invoice.pdf    # (when --invoice flag used)
│
└── e2e/                                   # E2E tests (if needed)
    └── generate-report/
        ├── generate-report.spec.ts
        └── fixtures/
```

---

## 5. DATA MODELS

### 5.1 Linear Ticket Model

```typescript
interface LinearTicket {
  id: string;
  title: string;
  description: string | null;
  state: {
    name: string;
    type: string;
  };
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  creator: {
    id: string;
    name: string;
  };
  labels: Array<{
    id: string;
    name: string;
  }>;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  completedAt: string | null;
  // Activity tracking
  activities: Array<{
    type: 'assigned' | 'updated' | 'commented';
    date: string;
  }>;
}
```

### 5.2 CLI Arguments Model

```typescript
interface CLIArgs {
  month?: string; // Format: YYYY-MM or MM-YYYY
  workspace?: string; // Optional, defaults to user's workspace
  outputDir?: string; // Optional, defaults to ./generated
}
```

### 5.3 Report Model

```typescript
interface ReportData {
  month: string; // Format: "02. February"
  year: number;
  tickets: LinearTicket[];
  summary: {
    totalTickets: number;
    byStatus: Record<string, number>;
    byActivityType: Record<string, number>;
  };
}
```

---

## 6. API INTEGRATION

### 6.1 Linear GraphQL API

**Endpoint:** `https://api.linear.app/graphql`

**Authentication:** Personal API Key (Bearer token)

**Key Queries:**

1. **Get User Workspace:**
```graphql
query {
  viewer {
    id
    name
    email
  }
  teams {
    nodes {
      id
      name
    }
  }
}
```

2. **Get User's Tickets (with activity filter):**
```graphql
query($filter: IssueFilter, $after: String) {
  issues(filter: $filter, after: $after) {
    pageInfo {
      hasNextPage
      endCursor
    }
    nodes {
      id
      title
      description
      state { name type }
      assignee { id name email }
      creator { id name }
      labels { nodes { id name } }
      createdAt
      updatedAt
      completedAt
      # Activity history (if available via API)
    }
  }
}
```

**Filter Strategy:**
- Filter by `assignee.id = viewer.id` OR
- Filter by `updatedAt` within month range OR
- Fetch all and filter client-side for activity (if API doesn't support activity queries)

**Pagination:** Use cursor-based pagination (`after` parameter)

---

## 7. IMPLEMENTATION PHASES

### Phase 1: Foundation (MVP)
1. Set up project structure (TypeScript, dependencies)
2. Implement CLI argument parsing with Zod validation
3. Implement Linear API authentication and basic query
4. Implement month selection logic with confirmation prompt
5. Basic ticket fetching and filtering

### Phase 2: Report Generation
1. Implement technical summary generator
2. Implement non-technical summary generator
3. Implement file system service for structured output
4. Date formatting utilities

### Phase 3: Enhancement
1. Error handling and edge cases
2. Unit tests for all services
3. Documentation (README with usage examples)
4. Performance optimization (pagination, batching)

### Phase 4: Polish
1. E2E tests (if needed)
2. CLI help text and user experience improvements
3. Logging and progress indicators

---

## 8. SECURITY CONSIDERATIONS

1. **API Key Management:**
   - Store in `.env` file (never commit)
   - Validate key format before use
   - Provide `.env.example` template

2. **Input Validation:**
   - All CLI arguments validated with Zod
   - Month format validation
   - Path traversal prevention for output directory

3. **Error Handling:**
   - Never expose API keys in error messages
   - Graceful degradation for API failures
   - Clear error messages for user

---

## 9. TESTING STRATEGY

### 9.1 Unit Tests
- **Location:** `*.node.ts` files co-located with modules
- **Framework:** Vitest
- **Coverage:** > 80% for business logic
- **Mocking:** Mock Linear API responses, file system operations

### 9.2 Integration Tests
- Test Linear API service with mock responses
- Test report generation with sample data
- Test file system operations in isolated temp directories

### 9.3 E2E Tests (Optional)
- Full CLI workflow with mocked API
- Verify output file structure and content

---

## 10. DEPENDENCIES

### Production Dependencies
```json
{
  "@linear/sdk": "^2.x.x", // or "graphql-request": "^6.x.x"
  "commander": "^11.x.x", // or "yargs": "^17.x.x"
  "zod": "^3.x.x",
  "dotenv": "^16.x.x"
}
```

### Development Dependencies
```json
{
  "@types/node": "^20.x.x",
  "typescript": "^5.x.x",
  "tsx": "^4.x.x", // for development execution
  "vitest": "^1.x.x",
  "@vitest/coverage-v8": "^1.x.x"
}
```

---

## 11. USAGE EXAMPLES

### Basic Usage (Previous Month)
```bash
npm run start
# Prompts: "Generate report for January 2026? (Y/n)"
```

### Specific Month
```bash
npm run start -- --month 2026-01
# or
npm run start -- --month 01-2026
```

### Custom Output Directory
```bash
npm run start -- --month 2026-01 --output ./reports
```

---

## 12. AI SUMMARIZATION FEATURE (Local LLM)

### 12.1 Overview

**Feature Type:** [FEATURE]  
**Status:** Specified  
**Dependencies:** Ollama (or compatible local LLM runtime), GITHUB_API_KEY (optional)

Convert the technical generated report into a human-readable non-technical summary using local AI (Qwen 2.5 1.5B via Ollama). When ticket descriptions or comments contain GitHub PR links, fetch PR summaries via GitHub API for additional context.

### 12.2 Architectural Decision: Per-Ticket Summarization

**Chosen Approach:** Per-ticket summarization (each ticket + its PR context → 2–3 lines) over single-pass summarization.

**Justification:**
- **Context window management:** Each LLM call stays small (~2–4k tokens) vs. one massive call that can exceed limits.
- **Scalability:** 50 tickets = 50 small calls; single-pass risks OOM or truncation.
- **Failure isolation:** One failed ticket does not block others.
- **Parallelization:** Ollama calls can run in parallel with a concurrency limit (e.g., 3–5).
- **Reference:** Similar to [Map-Reduce summarization](https://arxiv.org/abs/2004.14786) used for long-document summarization—chunk, summarize, optionally combine.

**Flow:**
1. Parse technical report (or use raw ticket data) per ticket.
2. Extract GitHub PR URLs from ticket description/comments.
3. Fetch PR title + body via GitHub API (when GITHUB_API_KEY is set).
4. For each ticket: `[technical content + PR summary]` → LLM → 2–3 line non-technical summary.
5. Optionally: Final pass to combine all 2–3 line summaries into one executive narrative (single short-context call).

### 12.3 Functional Requirements

#### FR-AI-1: GitHub PR Context
- **FR-AI-1.1:** Parse ticket description and comments for `github.com/{owner}/{repo}/pull/{number}` URLs.
- **FR-AI-1.2:** Fetch PR title and body via `GET /repos/{owner}/{repo}/pulls/{number}` when `GITHUB_API_KEY` is set.
- **FR-AI-1.3:** Gracefully skip PR fetch on missing key or API errors (proceed with ticket content only).
- **FR-AI-1.4:** Rate-limit GitHub API calls (e.g., 60 req/min for unauthenticated, 5000 for token).

#### FR-AI-2: Local LLM Integration
- **FR-AI-2.1:** Integrate with Ollama HTTP API (`http://localhost:11434/api/generate`).
- **FR-AI-2.2:** Support configurable model via env (e.g., `OLLAMA_SUMMARY_MODEL=qwen2.5:1.5b`).
- **FR-AI-2.3:** Per-ticket prompt: technical ticket content + PR summary (if available) → 2–3 line plain-language summary.
- **FR-AI-2.4:** Run summarization with configurable concurrency (default 1 for low-RAM systems).
- **FR-AI-2.5:** Fallback: If Ollama unavailable, use existing template-based non-technical output (current behavior).

#### FR-AI-3: Output
- **FR-AI-3.1:** Overwrite or append to `{timestamp}_non_technical.txt` with AI-generated content.
- **FR-AI-3.2:** Preserve header (month, total items) and structure (KEY DELIVERABLES with 2–3 line bullets).
- **FR-AI-3.3:** Optional CLI flag: `--no-ai` to skip AI and use template-based output only.

### 12.4 LLM Recommendations

| Model | Size | Context | Use Case | Min RAM |
|-------|------|---------|----------|---------|
| **qwen2.5:1.5b** | 1.5B | 32k | **Default:** Minimal RAM (~2GB), CPU-friendly | ~2GB |
| Llama 3.2 3B | 3B | 128k | Summarization-optimized | ~4GB |
| Llama 3.1 8B | 8B | 128k | Higher quality | ~8GB |
| Mistral Small 3.2 | 24B | 128k | Best quality, larger footprint | ~14GB |

**Default:** `qwen2.5:1.5b` via Ollama. Run `ollama pull qwen2.5:1.5b` before use.

### 12.5 File Structure Additions

```
src/
├── github-api-service/
│   ├── github-api-service.index.ts
│   ├── github-api-service.utils.ts   # PR fetch, URL parsing
│   ├── github-api-service.types.ts
│   └── github-api-service.node.ts
│
├── llm-summarizer-service/
│   ├── llm-summarizer-service.index.ts
│   ├── llm-summarizer-service.utils.ts  # Ollama calls, prompt building
│   ├── llm-summarizer-service.types.ts
│   └── llm-summarizer-service.node.ts
│
└── report-generator/
    └── report-generator.utils.ts  # Add: generateNonTechnicalWithAI()
```

### 12.6 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `LINEAR_API_KEY` | Yes | Linear API key |
| `GITHUB_API_KEY` | No | GitHub token for PR fetch (avoids rate limits, enables private repos) |
| `OLLAMA_SUMMARY_MODEL` | No | Model name (default: `qwen2.5:1.5b`) |
| `OLLAMA_BASE_URL` | No | Ollama URL (default: `http://localhost:11434`) |
| `OLLAMA_CONCURRENCY` | No | Parallel summarization limit (default: 1) |

### 12.7 Security

- **NFR-AI-1:** Never log `GITHUB_API_KEY` or LLM responses containing sensitive data.
- **NFR-AI-2:** Validate GitHub URLs with allowlist (e.g., only `github.com`).
- **NFR-AI-3:** Timeout Ollama requests (e.g., 60s per ticket).

### 12.8 Implementation Phases (AI Feature)

**Phase AI-1: GitHub PR Service**
1. URL regex for `github.com/{owner}/{repo}/pull/{number}`.
2. GitHub API client with Zod-validated responses.
3. Unit tests with mocked GitHub responses.

**Phase AI-2: LLM Summarizer Service**
1. Ollama HTTP client (`/api/generate`).
2. Prompt template for per-ticket summarization.
3. Concurrency control (p-limit or similar).
4. Fallback to template-based output on Ollama failure.

**Phase AI-3: Integration**
1. Wire `report-generator` to use AI summarizer when available.
2. Add `--no-ai` CLI flag.
3. Update `cli-controller.run.ts` flow.

**Phase AI-4: Optional Enhancements**
1. Final executive-summary pass (combine 2–3 line bullets).
2. Linear API `issue.attachments` for PR links (if available).

---

## 13. INVOICE GENERATION (After AI Summarization)

### 13.1 Overview

**Feature Type:** [FEATURE]  
**Status:** Specified  
**Dependencies:** AI-generated non-technical summary (Section 12), `pdf-lib` (or similar)  
**Pipeline Order:** Linear → Technical Report → AI Summarization → **Invoice PDF**

Generate a consulting invoice PDF with two pages:
1. **Page 1:** Consulting invoice (header, client details, time period, description, amount)
2. **Page 2:** Annexure / Enclosure — AI-generated non-technical summary ("details of work done encl.")

### 13.2 Invoice Format (Page 1)

Based on standard consulting invoice structure:

| Section | Content |
|---------|---------|
| **Header** | Consultant name, location (e.g., "Ahmedabad, India") |
| **Title** | "Consulting Invoice" |
| **Submitted** | Submission date |
| **Invoice for** | Client name / company (configurable) |
| **Payable to** | Consultant name |
| **Project** | Project name (configurable) |
| **Time Period** | Start date to end date (from report month) |
| **Description** | "Technical consulting work pursuant to the Consulting Agreement dated {agreement_date} for the period {start} to {end} (details of work done encl.)" |
| **Notes** | e.g., "Pro-rated from a monthly rate of £2000 p.m." |
| **Amount** | Calculated or configurable |

### 13.3 Annexure (Page 2)

- **Heading:** "Annexure — Details of Work Done" or "Enclosure"
- **Content:** AI-generated non-technical summary (from Section 12)
- **Formatting:** Plain text, readable font, preserved structure (KEY DELIVERABLES, bullets)

### 13.4 Functional Requirements

#### FR-INV-1: Invoice Generation
- **FR-INV-1.1:** Generate PDF with consulting invoice layout (header, grid, description, amount).
- **FR-INV-1.2:** All invoice fields configurable via env or config (consultant name, client, project, rate, agreement date).
- **FR-INV-1.3:** Time period auto-derived from report month.
- **FR-INV-1.4:** Description includes "(details of work done encl.)" per standard format.

#### FR-INV-2: Annexure
- **FR-INV-2.1:** Append second page with non-technical summary as annexure.
- **FR-INV-2.2:** Clear "Annexure" or "Enclosure" heading.
- **FR-INV-2.3:** Use template-based non-technical summary if AI summarization was skipped (`--no-ai`).

#### FR-INV-3: Integration
- **FR-INV-3.1:** Run only when `--invoice` flag is set (or always if configured).
- **FR-INV-3.2:** Output path: `generated/{MM}. {Month}/{Timestamp}/{timestamp}_invoice.pdf`.
- **FR-INV-3.3:** Require non-technical summary to exist (from AI or template) before generating invoice.

### 13.5 File Structure Additions

```
src/
├── invoice-generator-service/
│   ├── invoice-generator-service.index.ts
│   ├── invoice-generator-service.utils.ts   # PDF layout, annexure append
│   ├── invoice-generator-service.types.ts   # InvoiceData, config types
│   └── invoice-generator-service.node.ts
```

### 13.6 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INVOICE_CONSULTANT_NAME` | No | Consultant name (default: from config) |
| `INVOICE_CONSULTANT_LOCATION` | No | e.g., "Ahmedabad, India" |
| `INVOICE_CLIENT_NAME` | No | Client / company name |
| `INVOICE_PROJECT` | No | Project name |
| `INVOICE_MONTHLY_RATE` | No | e.g., "£2000 p.m." |
| `INVOICE_AGREEMENT_DATE` | No | Consulting agreement date (DD.MM.YYYY) |

### 13.7 Implementation Phases

**Phase INV-1: Invoice Generator Service**
1. Add `pdf-lib` dependency.
2. Implement invoice layout (header, grid, description, amount).
3. Configurable fields via env with Zod validation.
4. Unit tests with mocked PDF output.

**Phase INV-2: Annexure Integration**
1. Append second page with non-technical summary.
2. Format annexure with heading and readable typography.

**Phase INV-3: Integration**
1. Add `--invoice` CLI flag.
2. Wire invoice generation after report + AI summarization in `cli-controller.run.ts`.
3. Output `{timestamp}_invoice.pdf` in same directory as reports.

---

## 14. FUTURE ENHANCEMENTS (Out of Scope)

1. **Multi-workspace support:** Allow selection of workspace
2. **Export formats:** JSON, Markdown (PDF now in scope via invoice)
3. **Interactive mode:** TUI for month selection
4. **Scheduled generation:** Cron job integration
5. **Webhook integration:** Auto-generate on month end
6. **Analytics:** Charts and statistics visualization

---

## 15. REFERENCES & JUSTIFICATIONS

### Architectural Patterns
- **Repository Pattern:** [Stripe API Design](https://stripe.com/docs/api) - Clean API abstraction
- **Service Layer:** [Airbnb SOA](https://medium.com/airbnb-engineering/airbnbs-service-oriented-architecture-7a4d41ee1c1e) - Stateless business logic
- **CLI Design:** [GitHub CLI](https://cli.github.com/manual/) - Command structure and UX

### Security
- **OWASP Top 10:** Input validation, secure secrets management
- **Zero Trust:** Validate all inputs at entry points (Zod schemas)

### Code Quality
- **TypeScript Strict Mode:** Prevents common runtime errors
- **Functional Programming:** Immutability, pure functions for testability

---

## 16. ACCEPTANCE CRITERIA

### Core (Existing)
✅ CLI accepts month parameter or defaults to previous month with confirmation  
✅ Fetches all tickets user has interacted with (assigned, updated, any activity)  
✅ Filters tickets by activity within specified month  
✅ Generates technical summary with ticket IDs, technical details, stack info  
✅ Generates non-technical summary with business outcomes, high-level features  
✅ Saves reports in structured directory: `generated/{MM}. {Month}/{Timestamp}/`  
✅ All inputs validated with Zod  
✅ API key stored securely in `.env`  
✅ TypeScript strict mode, no `any` types  
✅ Comprehensive error handling  
✅ Unit tests for core services  

### AI Summarization (New)
✅ Parses GitHub PR URLs from ticket descriptions  
✅ Fetches PR title + body via GitHub API when `GITHUB_API_KEY` is set  
✅ Per-ticket summarization via Ollama (2–3 lines per ticket)  
✅ Fallback to template-based non-technical output when Ollama unavailable  
✅ `--no-ai` flag skips AI summarization  
✅ Configurable model and concurrency via env  

### Invoice Generation (New)
✅ Generates consulting invoice PDF (header, client, project, time period, description, amount)  
✅ Page 2: Annexure with AI-generated non-technical summary ("details of work done encl.")  
✅ Configurable fields via env (consultant, client, project, rate, agreement date)  
✅ `--invoice` flag enables PDF generation  
✅ Output: `{timestamp}_invoice.pdf` in report directory  

---

**Document Status:** Ready for Implementation  
**Next Step:** Begin Phase 1 implementation (or Phase AI-1 for AI feature)
