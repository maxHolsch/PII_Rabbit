# PII Shield - Chrome Extension Implementation Plan

## Executive Summary

PII Shield is a Chrome extension that intercepts ChatGPT interactions, redacts PII via a local LLM, and displays de-anonymized content through Shadow DOM overlays. This plan prioritizes **observability**, **seamless user interactions**, and **modular architecture** for maintainability.

---

## Configuration Decisions

| Setting | Value | Rationale |
|---------|-------|-----------|
| **LLM Server Port** | `localhost:1234` | LM Studio default, compatible with OpenAI format |
| **LLM Model** | `qwen/qwen3-4b-thinking-2507` | User's local model |
| **UI Framework** | React 18 + Vite | Modern tooling, fast HMR, familiar ecosystem |
| **Mock Server** | Not included | Develop against real LLM only |
| **MVP Scope** | Core redaction flow | Input → LLM → Review → Inject → De-anonymize |

---

## MVP Scope (Phases 1-6)

The **minimum viable product** includes only the core redaction flow:

```
User Input → LLM Redaction → Review/Approve → Inject to ChatGPT → De-anonymize Response
```

**MVP Features:**
- ✅ Input Overlay (capture user text)
- ✅ LLM Integration (redact PII)
- ✅ Review Overlay (approve/edit redactions)
- ✅ ChatGPT Injection (send redacted text)
- ✅ Response De-anonymization (show real names)
- ✅ Basic persistence (IndexedDB mappings)
- ✅ Extension toggle (ON/OFF)

**Post-MVP Features (Phases 7-12):**
- ❌ Side Panel UI
- ❌ Companionship/Echo Chamber Scores
- ❌ Poison Pill Mode
- ❌ File Redaction
- ❌ Onboarding Flow

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Modules](#3-core-modules)
4. [User Interaction Flows](#4-user-interaction-flows)
5. [Observability Strategy](#5-observability-strategy)
6. [Implementation Phases](#6-implementation-phases)
7. [Testing Strategy](#7-testing-strategy)
8. [Verification Checklist](#8-verification-checklist)

---

## 1. Project Structure

```
pii-shield/
├── manifest.json                 # Chrome extension manifest (MV3)
├── package.json                  # Dependencies & build scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Build configuration
│
├── src/
│   ├── background/
│   │   ├── index.ts              # Service worker entry
│   │   ├── message-handler.ts    # Cross-component messaging
│   │   └── state-manager.ts      # Global extension state
│   │
│   ├── content/
│   │   ├── index.ts              # Content script entry
│   │   ├── chatgpt-detector.ts   # ChatGPT page detection & DOM observation
│   │   ├── url-manager.ts        # Conversation ID tracking
│   │   └── injector.ts           # Shadow DOM host injection
│   │
│   ├── overlays/
│   │   ├── input-overlay/
│   │   │   ├── InputOverlay.tsx  # Custom input area component
│   │   │   ├── state-machine.ts  # IDLE/PROCESSING/REVIEW/SENDING/ERROR states
│   │   │   └── styles.css        # Scoped styles
│   │   │
│   │   ├── review-overlay/
│   │   │   ├── ReviewOverlay.tsx # Redaction review modal
│   │   │   ├── RedactedSpan.tsx  # Interactive pseudonym display
│   │   │   └── styles.css
│   │   │
│   │   ├── message-overlay/
│   │   │   ├── MessageOverlay.tsx    # Per-message de-anonymization
│   │   │   ├── DeAnonymizedSpan.tsx  # Inline replacement spans
│   │   │   └── styles.css
│   │   │
│   │   └── side-panel/
│   │       ├── SidePanel.tsx     # Main side panel container
│   │       ├── PoisonPill.tsx    # Poison pill controls
│   │       ├── ScoreDisplay.tsx  # Companionship/Echo chamber scores
│   │       ├── FileRedaction.tsx # File upload & redaction
│   │       └── styles.css
│   │
│   ├── services/
│   │   ├── llm-client.ts         # Local LLM API communication
│   │   ├── redaction-service.ts  # PII redaction orchestration
│   │   ├── mapping-service.ts    # Pseudonym <-> real entity management
│   │   ├── scoring-service.ts    # Companionship/Echo chamber analysis
│   │   └── poison-pill-service.ts # Automated conversation generation
│   │
│   ├── storage/
│   │   ├── indexeddb.ts          # IndexedDB wrapper
│   │   ├── mapping-store.ts      # Conversation mappings CRUD
│   │   └── settings-store.ts     # User preferences
│   │
│   ├── utils/
│   │   ├── logger.ts             # Centralized logging with levels
│   │   ├── event-bus.ts          # Component communication
│   │   ├── react-sync.ts         # React state synchronization helpers
│   │   └── dom-utils.ts          # DOM manipulation utilities
│   │
│   ├── types/
│   │   ├── index.ts              # Shared type definitions
│   │   ├── llm.ts                # LLM request/response types
│   │   ├── mapping.ts            # Mapping schema types
│   │   └── events.ts             # Event payload types
│   │
│   └── popup/
│       ├── Popup.tsx             # Extension icon popup
│       └── styles.css
│
├── public/
│   ├── icons/                    # Extension icons
│   └── onboarding.html           # First-run onboarding page
│
└── tests/
    ├── unit/                     # Unit tests
    ├── integration/              # Integration tests
    └── e2e/                      # End-to-end tests
```

---

## 2. Architecture Overview

### Component Communication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BROWSER TAB (chatgpt.com)                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────┐   │
│  │ ChatGPT DOM  │◄───│ Content      │◄───│ Shadow DOM Overlays      │   │
│  │              │    │ Script       │    │ (Input, Review, Message) │   │
│  └──────────────┘    └──────┬───────┘    └────────────┬─────────────┘   │
│                             │                         │                  │
│                             │ Chrome Messages         │ Events           │
│                             ▼                         ▼                  │
│                      ┌──────────────┐          ┌─────────────┐          │
│                      │ Event Bus    │◄────────►│ State       │          │
│                      │ (pub/sub)    │          │ Machine     │          │
│                      └──────┬───────┘          └─────────────┘          │
│                             │                                            │
└─────────────────────────────┼────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │      Service Worker           │
              │   (Background Script)         │
              ├───────────────────────────────┤
              │ - Global state management     │
              │ - Cross-tab coordination      │
              │ - IndexedDB operations        │
              │ - LLM API calls               │
              └───────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │   Local LLM Server            │
              │   localhost:1234/v1/chat/...  │
              │   (LM Studio / OpenAI format) │
              └───────────────────────────────┘
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Shadow DOM for all overlays** | Style isolation, DOM independence, ChatGPT update resilience |
| **State machine for input flow** | Predictable UI states, easy debugging, clear user feedback |
| **Event bus pattern** | Decoupled components, easy observability hooks, testability |
| **IndexedDB for storage** | Large capacity, async API, per-conversation namespacing |
| **Service worker for LLM calls** | Avoids CORS issues, centralizes network logic |

---

## 3. Core Modules

### 3.1 Content Script (`content/index.ts`)

**Responsibilities:**
- Detect ChatGPT page and initialize overlays
- Observe DOM for new messages
- Manage URL/conversation ID changes
- Inject Shadow DOM hosts

**Key Observability Points:**
```typescript
// Every major action logged with context
logger.info('content:init', { url: window.location.href });
logger.debug('content:mutation', { addedNodes: count, type: 'message' });
logger.info('content:conversation-change', { from: oldId, to: newId });
```

### 3.2 Input Overlay (`overlays/input-overlay/`)

**State Machine:**
```
IDLE ──[submit]──► PROCESSING ──[success]──► REVIEW ──[approve]──► SENDING ──► IDLE
  ▲                    │                        │                      │
  │                    │                        │                      │
  └────────[cancel]────┴────────[cancel]────────┴────────[done]────────┘
                       │
                       └──[error]──► ERROR ──[retry]──► PROCESSING
```

**User Interaction Handling:**
- Captures all keystrokes in Shadow DOM input
- Prevents propagation to ChatGPT's native input
- Shows real-time character count
- Displays keyboard shortcuts (Ctrl+Enter to submit)

### 3.3 Review Overlay (`overlays/review-overlay/`)

**Interactive Elements:**
- Highlighted pseudonym spans with hover tooltips
- Click-to-edit popover for each redaction
- Text selection + right-click for manual redaction
- "Approve & Send" / "Cancel" buttons

**Coordination with Input Overlay:**
- Review overlay appears as modal over input overlay
- Input overlay remains visible but disabled during review
- Seamless transition back to input on cancel

### 3.4 Message Overlay (`overlays/message-overlay/`)

**DOM Injection Strategy:**
```typescript
// For each message container:
1. Parse message text for pseudonym matches
2. Create TextNode -> ShadowHost replacements
3. Insert shadow hosts inline (not absolute positioned)
4. Shadow content shows real entity with styling
```

**Mutation Observer Pattern:**
```typescript
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (isMessageContainer(node)) {
        logger.debug('message:detected', { id: extractMessageId(node) });
        processNewMessage(node);
      }
    }
  }
});
```

### 3.5 LLM Client (`services/llm-client.ts`)

**Endpoint Configuration:**
```typescript
const LLM_CONFIG = {
  baseUrl: 'http://localhost:1234',
  endpoint: '/v1/chat/completions',
  model: 'qwen/qwen3-4b-thinking-2507',
  timeout: 30000,
};
```

**Request Format (OpenAI-compatible):**
```typescript
// Request to LM Studio
const request = {
  model: LLM_CONFIG.model,
  messages: [
    {
      role: 'system',
      content: `You are a PII redaction assistant. Given text, identify and replace:
- Names → [Person N]
- Addresses → [Location N]
- Phone numbers → [Phone N]
- Emails → [Email N]
- Other PII → [PII N]

Maintain consistency with existing mappings: ${JSON.stringify(existingMappings)}

Return JSON: { "redacted_text": "...", "mappings": { "Person 1": "real name", ... } }`
    },
    {
      role: 'user',
      content: `Redact PII from: ${userText}`
    }
  ],
  temperature: 0.3,  // Low temp for consistent redaction
  max_tokens: -1,
  stream: false,
};
```

**Response Parsing:**
```typescript
interface LLMResponse {
  choices: [{
    message: {
      content: string;  // JSON string to parse
    }
  }];
}

interface RedactionResult {
  redacted_text: string;
  mappings: Record<string, string>;
}
```

**Error Handling:**
- Connection refused → Show "LLM server not running" with setup link
- Timeout (30s) → "Taking too long" with retry/skip options
- Invalid JSON → Log error, show "Redaction failed" with retry
- Empty response → Treat as "no PII found"

### 3.6 Mapping Service (`services/mapping-service.ts`)

**Consistency Enforcement:**
```typescript
// Handle name variations
const normalizeEntity = (name: string): string => {
  // "Sarah Chen", "Sarah", "Dr. Chen" → canonical form
};

// LLM prompt includes existing mappings
const buildPrompt = (text: string, mappings: Mappings) => `
You are a PII redaction assistant. Maintain consistency with existing mappings:
${JSON.stringify(mappings)}

Redact PII from the following text, using existing pseudonyms where applicable:
${text}
`;
```

### 3.7 Scoring Service (`services/scoring-service.ts`)

**Passive Analysis:**
- Runs after each message exchange
- Analyzes conversation patterns via local LLM
- Updates scores in real-time
- No user action required

**Score Update Flow:**
```
New Message → Extract Last N Turns → Send to LLM → Parse Scores → Update UI
```

### 3.8 Poison Pill Service (`services/poison-pill-service.ts`)

**Generation Flow:**
```
1. Generate 20 topics, 20 emotions, 20 challenges via LLM
2. Random selection (3 random indices)
3. Start conversation loop (7-11 turns)
4. Each turn: LLM generates "user" message → inject → wait for ChatGPT → repeat
5. User can stop anytime
```

**Safety Mechanisms:**
- Rate limiting: 1 session per hour
- Random delays between messages (2-8 seconds)
- Clear visual indicator (purple border)
- Disclaimer required before first use

---

## 4. User Interaction Flows

### 4.1 Normal Message Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: User Input                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ User types in Input Overlay (Shadow DOM)                                    │
│ ► Native ChatGPT input is hidden/disabled                                   │
│ ► Real-time character count shown                                           │
│ ► OBSERVABILITY: logger.info('input:keystroke', { length })                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Submit for Redaction                                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ User clicks "Secure & Send" or presses Ctrl+Enter                           │
│ ► State: IDLE → PROCESSING                                                  │
│ ► Input locked, spinner shown                                               │
│ ► "Analyzing for PII..." message displayed                                  │
│ ► OBSERVABILITY: logger.info('redaction:start', { textLength, convId })     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: LLM Processing                                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Text sent to local LLM with existing mappings                               │
│ ► Background service makes API call                                         │
│ ► Progress indicator: "Taking longer than expected..." after 10s            │
│ ► Timeout at 30s with retry option                                          │
│ ► OBSERVABILITY: logger.info('llm:request', { endpoint, timeout })          │
│ ► OBSERVABILITY: logger.info('llm:response', { latency_ms, mappingCount })  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: Review Redactions                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ State: PROCESSING → REVIEW                                                  │
│ Review Overlay appears showing:                                             │
│ ► Redacted text with [Person 1], [Location 1] highlighted                   │
│ ► Hover: tooltip shows original value                                       │
│ ► Click: popover with "Keep redacted", "Change pseudonym", "Don't redact"   │
│ ► Text selection + right-click: "Add redaction" for missed items            │
│ ► OBSERVABILITY: logger.info('review:shown', { redactionCount })            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    ▼                               ▼
┌──────────────────────────────┐  ┌──────────────────────────────────────────┐
│ STEP 5a: User Approves       │  │ STEP 5b: User Cancels                    │
├──────────────────────────────┤  ├──────────────────────────────────────────┤
│ Clicks "Approve & Send"      │  │ Clicks "Cancel"                          │
│ ► State: REVIEW → SENDING    │  │ ► State: REVIEW → IDLE                   │
│ ► Mappings saved to IndexedDB│  │ ► Original text restored to input        │
│ ► OBSERVABILITY: logger.info │  │ ► No data sent anywhere                  │
│   ('review:approved', {      │  │ ► OBSERVABILITY: logger.info             │
│     edits, finalMappings })  │  │   ('review:cancelled')                   │
└──────────────────────────────┘  └──────────────────────────────────────────┘
            │
            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 6: Inject into ChatGPT                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│ Redacted text injected into ChatGPT's native input                          │
│ ► React state sync: dispatch input/change events with bubbles: true         │
│ ► Programmatically trigger submit                                           │
│ ► State: SENDING → IDLE                                                     │
│ ► OBSERVABILITY: logger.info('inject:complete', { success: true })          │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 7: ChatGPT Responds                                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│ MutationObserver detects new message element                                │
│ ► Parse response for pseudonym matches (case-insensitive)                   │
│ ► Replace matches with de-anonymized Shadow DOM spans                       │
│ ► Original underlined, click shows "Sent as: Person 1"                      │
│ ► OBSERVABILITY: logger.info('response:processed', { replacements })        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ STEP 8: Update Scores (Background)                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ Scoring service analyzes conversation                                       │
│ ► Companionship score updated                                               │
│ ► Echo chamber score updated                                                │
│ ► Side panel indicator color/pulse updated                                  │
│ ► OBSERVABILITY: logger.info('scores:updated', { companion, echo })         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 File Redaction Flow

```
User drags .txt/.rtf into Side Panel
    │
    ▼
File contents read (FileReader API)
    │
    ▼
Contents sent to LLM for PII detection
    │ OBSERVABILITY: logger.info('file:analyzing', { name, size })
    ▼
Preview shown with highlighted redactions
    │ User can approve/modify/reject each
    ▼
"Prepare for Upload" creates redacted file
    │ OBSERVABILITY: logger.info('file:prepared', { originalSize, redactedSize })
    ▼
User manually uploads redacted file to ChatGPT
```

### 4.3 Conversation ID Management

```
New Chat (URL: chatgpt.com/)
    │
    ▼
Generate temp ID: "temp-{timestamp}"
    │ OBSERVABILITY: logger.debug('conv:temp-id', { id })
    ▼
User sends first message
    │
    ▼
URL changes to chatgpt.com/c/{uuid}
    │ Detected via History API override + popstate listener
    │ OBSERVABILITY: logger.info('conv:url-change', { from, to })
    ▼
Migrate mappings: temp-id → real uuid
    │ Atomic IndexedDB transaction
    │ OBSERVABILITY: logger.info('conv:migrate', { tempId, realId, mappingCount })
    ▼
Continue with real conversation ID
```

---

## 5. Observability Strategy

### 5.1 Logging Architecture

```typescript
// src/utils/logger.ts
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: Record<string, unknown>;
  stack?: string;
}

class Logger {
  private buffer: LogEntry[] = [];
  private maxBuffer = 1000;

  log(level: LogLevel, category: string, message: string, data?: Record<string, unknown>) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
    };

    // Console output (dev mode)
    if (isDev) {
      console[level](`[${category}] ${message}`, data);
    }

    // Buffer for export/debugging
    this.buffer.push(entry);
    if (this.buffer.length > this.maxBuffer) {
      this.buffer.shift();
    }

    // Emit for UI display (optional debug panel)
    eventBus.emit('log:entry', entry);
  }

  exportLogs(): string {
    return JSON.stringify(this.buffer, null, 2);
  }
}
```

### 5.2 Observable Categories

| Category | Example Events |
|----------|---------------|
| `content:*` | init, mutation, conversation-change |
| `input:*` | keystroke, submit, state-change |
| `redaction:*` | start, complete, error |
| `llm:*` | request, response, timeout, error |
| `review:*` | shown, edit, approved, cancelled |
| `inject:*` | attempt, success, failure |
| `response:*` | detected, processed, replaced |
| `storage:*` | save, load, migrate, clear |
| `scoring:*` | analyze, updated |
| `poison:*` | start, turn, complete, stopped |
| `file:*` | loaded, analyzing, prepared |

### 5.3 Debug Panel (Development)

Side panel includes a collapsible "Debug" section showing:
- Recent log entries (filterable by category/level)
- Current state machine state
- Active conversation ID
- Current mappings count
- LLM connection status
- Performance metrics (last LLM latency, etc.)

### 5.4 Error Tracking

```typescript
// Centralized error handling
window.addEventListener('error', (event) => {
  logger.error('global', 'Uncaught error', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
  });
});

// Promise rejection tracking
window.addEventListener('unhandledrejection', (event) => {
  logger.error('global', 'Unhandled promise rejection', {
    reason: String(event.reason),
  });
});
```

---

## 6. Implementation Phases

### MVP Phases (1-6) - Core Redaction Flow

---

### Phase 1: Foundation [MVP]
**Goal:** Project setup, basic extension skeleton, logging infrastructure

**Tasks:**
1. Initialize project with Vite + React + TypeScript
2. Configure Chrome extension manifest (MV3)
3. Implement logger utility with buffering
4. Create event bus for component communication
5. Set up IndexedDB wrapper with basic CRUD
6. Create Shadow DOM injection utilities
7. Implement ChatGPT page detector

**Observability Checkpoints:**
- [ ] Logger outputs to console in dev mode
- [ ] Extension loads on chatgpt.com
- [ ] Shadow DOM hosts injected successfully

**Files to Create:**
- `manifest.json`
- `src/utils/logger.ts`
- `src/utils/event-bus.ts`
- `src/storage/indexeddb.ts`
- `src/content/index.ts`
- `src/content/chatgpt-detector.ts`
- `src/content/injector.ts`

### Phase 2: Input Overlay [MVP]
**Goal:** Functional input capture with state machine

**Tasks:**
1. Create Input Overlay React component
2. Implement 5-state state machine
3. Style to match Figma designs
4. Intercept keyboard events
5. Block native ChatGPT input when active
6. Add toggle mechanism (ON/OFF)

**Observability Checkpoints:**
- [ ] State transitions logged
- [ ] Input captured (not reaching ChatGPT)
- [ ] Toggle state persisted

**Files to Create:**
- `src/overlays/input-overlay/InputOverlay.tsx`
- `src/overlays/input-overlay/state-machine.ts`
- `src/overlays/input-overlay/styles.css`
- `src/popup/Popup.tsx`

### Phase 3: LLM Integration [MVP]
**Goal:** Connect to local LLM (localhost:1234), basic redaction working

**Tasks:**
1. Implement LLM client with OpenAI-compatible format
2. Create redaction service with prompt engineering
3. Handle connection errors gracefully
4. Implement timeout with "taking longer" feedback
5. Parse redaction response and extract mappings

**Observability Checkpoints:**
- [ ] LLM requests/responses logged with timing
- [ ] Errors handled and logged
- [ ] Timeout states visible in UI

**Files to Create:**
- `src/services/llm-client.ts`
- `src/services/redaction-service.ts`
- `src/types/llm.ts`

### Phase 4: Review Overlay [MVP]
**Goal:** Interactive redaction review and approval

**Tasks:**
1. Create Review Overlay modal component
2. Implement RedactedSpan with hover/click interactions
3. Add popover for redaction editing
4. Implement manual redaction (text selection)
5. Wire approve/cancel actions

**Observability Checkpoints:**
- [ ] All edits logged
- [ ] Approval/cancel logged with final state
- [ ] Manual redactions tracked

**Files to Create:**
- `src/overlays/review-overlay/ReviewOverlay.tsx`
- `src/overlays/review-overlay/RedactedSpan.tsx`
- `src/overlays/review-overlay/styles.css`

### Phase 5: ChatGPT Injection [MVP]
**Goal:** Successfully inject redacted text and trigger send

**Tasks:**
1. Implement React state synchronization
2. Detect ChatGPT's input element (textarea or contenteditable)
3. Inject text with proper event dispatching
4. Programmatically trigger submit
5. Handle edge cases (input element changes)

**Observability Checkpoints:**
- [ ] Injection attempts logged
- [ ] Success/failure tracked
- [ ] React sync events verified

**Files to Create:**
- `src/utils/react-sync.ts`
- `src/content/chatgpt-injector.ts`

### Phase 6: Response De-anonymization [MVP - FINAL]
**Goal:** Overlay ChatGPT responses with real names - completes core flow

**Tasks:**
1. Create Message Overlay component
2. Implement MutationObserver for new messages
3. Parse messages for pseudonym matches
4. Create inline Shadow DOM replacements
5. Style de-anonymized text (underline)

**Observability Checkpoints:**
- [ ] New messages detected and logged
- [ ] Replacements counted and logged
- [ ] Missed matches identified

**Files to Create:**
- `src/overlays/message-overlay/MessageOverlay.tsx`
- `src/overlays/message-overlay/DeAnonymizedSpan.tsx`
- `src/content/message-observer.ts`

---

### Post-MVP Phases (7-12) - Extended Features

---

### Phase 7: Storage & Persistence [POST-MVP]
**Goal:** Robust conversation mapping storage

**Tasks:**
1. Implement mapping store with conversation scoping
2. Create URL manager for conversation ID tracking
3. Implement temp ID → real ID migration
4. Add mapping cleanup for old conversations
5. Create settings store for preferences

**Observability Checkpoints:**
- [ ] All storage operations logged
- [ ] Migration logged with counts
- [ ] Storage errors handled

**Files to Create:**
- `src/storage/mapping-store.ts`
- `src/storage/settings-store.ts`
- `src/content/url-manager.ts`
- `src/services/mapping-service.ts`

### Phase 8: Side Panel & Scores [POST-MVP]
**Goal:** Side panel with scoring display

**Tasks:**
1. Create Side Panel container
2. Implement Companionship score display
3. Implement Echo Chamber score display
4. Create scoring service with LLM analysis
5. Add pulsing indicator based on score

**Observability Checkpoints:**
- [ ] Score calculations logged
- [ ] Score updates visible in UI
- [ ] Analysis timing tracked

**Files to Create:**
- `src/overlays/side-panel/SidePanel.tsx`
- `src/overlays/side-panel/ScoreDisplay.tsx`
- `src/services/scoring-service.ts`

### Phase 9: Poison Pill Feature [POST-MVP]
**Goal:** Automated fake conversation generation

**Tasks:**
1. Create Poison Pill UI component
2. Implement disclaimer flow
3. Create topic/emotion/challenge generation
4. Implement conversation loop with delays
5. Add stop mechanism
6. Apply purple border visual indicator

**Observability Checkpoints:**
- [ ] Each turn logged with content
- [ ] Rate limiting enforced
- [ ] Stop action logged

**Files to Create:**
- `src/overlays/side-panel/PoisonPill.tsx`
- `src/services/poison-pill-service.ts`

### Phase 10: File Redaction [POST-MVP]
**Goal:** Upload and redact .txt/.rtf files

**Tasks:**
1. Create file drop zone UI
2. Implement FileReader parsing
3. Send to LLM for redaction
4. Show preview with editable redactions
5. Generate redacted file for download

**Observability Checkpoints:**
- [ ] File processing logged (size, type)
- [ ] Redaction counts tracked
- [ ] Download/prepare logged

**Files to Create:**
- `src/overlays/side-panel/FileRedaction.tsx`
- `src/services/file-redaction-service.ts`

### Phase 11: Polish & Edge Cases [POST-MVP]
**Goal:** Handle all error cases, polish UI

**Tasks:**
1. Implement graceful degradation (LLM unavailable)
2. Add onboarding flow
3. Handle ChatGPT DOM changes
4. Comprehensive error messages
5. Performance optimization

### Phase 12: Testing & Documentation [POST-MVP]
**Goal:** Test coverage, documentation

**Tasks:**
1. Unit tests for services
2. Integration tests for flows
3. E2E tests with mock LLM
4. User documentation
5. Developer documentation

---

## 7. Testing Strategy

### Unit Tests
- State machine transitions
- Mapping service consistency logic
- LLM response parsing
- Pseudonym matching algorithm

### Integration Tests
- Input Overlay → LLM → Review Overlay flow
- Storage operations across conversation changes
- URL change detection and migration

### E2E Tests
- Full redaction flow with mock LLM
- Toggle ON/OFF behavior
- File redaction flow
- Poison pill with mock responses

### Manual Testing Checklist
- [ ] Extension loads on chatgpt.com
- [ ] Input overlay captures text
- [ ] LLM connection works
- [ ] Redactions shown correctly
- [ ] Approval sends to ChatGPT
- [ ] Response de-anonymized
- [ ] Scores update
- [ ] Poison pill runs
- [ ] Files redacted

---

## 8. Verification Checklist

### After Each Phase

1. **Logging Check**
   - Open DevTools console
   - Perform actions
   - Verify relevant logs appear with correct data

2. **State Verification**
   - Check IndexedDB via DevTools > Application
   - Verify mappings stored correctly

3. **UI Verification**
   - Compare against Figma designs
   - Test responsive behavior
   - Verify Shadow DOM isolation

4. **Error Handling**
   - Disconnect LLM server → verify error state
   - Corrupt storage → verify recovery
   - Slow LLM → verify timeout handling

### Final Verification

1. **Full User Flow**
   ```
   - Enable extension
   - Type message with PII
   - Review redactions
   - Approve and send
   - See response de-anonymized
   - Check scores update
   - Disable extension
   - Verify native ChatGPT works
   ```

2. **Persistence Test**
   ```
   - Create conversation with mappings
   - Close browser
   - Reopen same conversation
   - Verify mappings restored
   - Verify de-anonymization works
   ```

3. **Cross-Conversation Test**
   ```
   - Create conversation A with Person 1 = "Alice"
   - Create conversation B with Person 1 = "Bob"
   - Switch between conversations
   - Verify mappings stay separate
   ```

---

## Dependencies & Tech Stack

### Production Dependencies
- React 18 (UI components)
- TypeScript (type safety)
- Vite (build tooling)
- idb (IndexedDB wrapper)

### Development Dependencies
- ESLint + Prettier (code quality)
- Vitest (unit testing)
- Playwright (E2E testing)

### Chrome Extension APIs Used
- `chrome.storage.local` (settings backup)
- `chrome.runtime.sendMessage` (background communication)
- `chrome.tabs` (conversation detection)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| ChatGPT DOM changes break extension | Shadow DOM isolation, fallback to copy/paste |
| Local LLM too slow | Progressive feedback, option to skip redaction |
| IndexedDB quota exceeded | Automatic cleanup of old conversations |
| React state sync fails | Event-based retry, manual fallback |
| Poison pill detection by OpenAI | Rate limiting, random delays, clear disclaimer |

---

## Summary

This plan provides a **12-week implementation roadmap** with:
- **Comprehensive observability** at every interaction point
- **Modular architecture** for maintainability
- **Detailed user flows** ensuring seamless transitions
- **Clear testing strategy** for quality assurance

Each phase builds incrementally, allowing for validation before proceeding. The logging infrastructure established in Phase 1 ensures visibility throughout development and production use.
