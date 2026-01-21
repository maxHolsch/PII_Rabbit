# PII Shield

Chrome extension for protecting privacy in ChatGPT conversations through local PII redaction.

## Features

- **Local PII Redaction**: Uses a local LLM to detect and redact personal information
- **Shadow DOM Overlays**: Non-intrusive UI that survives ChatGPT updates
- **Conversation Mapping**: Maintains pseudonym consistency per conversation
- **Zero Cloud Dependency**: All processing happens locally

## Development Setup

### Prerequisites

- Node.js 18+
- LM Studio or compatible OpenAI-format LLM server running on `localhost:1234`
- Chrome/Chromium browser

### Installation

```bash
# Install dependencies
npm install

# Build extension (✅ Build tested and working!)
npm run build

# Or run in dev mode with hot reload
npm run dev
```

**Build Status**: ✅ Successfully builds to `dist/` folder



### Loading in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` directory

### LLM Setup

1. Install [LM Studio](https://lmstudio.ai/)
2. Download the model: `qwen/qwen3-4b-thinking-2507`
3. Start the local server on port 1234
4. Ensure the server is running before using the extension

## Architecture

### Directory Structure

```
src/
├── background/      # Service worker for LLM communication
├── content/         # Content script for ChatGPT page
├── overlays/        # React components in Shadow DOM
├── services/        # Business logic (LLM, redaction, mapping)
├── storage/         # IndexedDB wrapper
├── utils/           # Logging, events, DOM utilities
├── types/           # TypeScript definitions
└── popup/           # Extension popup UI
```

### Key Concepts

- **Shadow DOM**: All overlays use Shadow DOM for style isolation
- **Event Bus**: Pub/sub pattern for component communication
- **State Machine**: Input overlay uses 5-state FSM (IDLE → PROCESSING → REVIEW → SENDING → IDLE)
- **IndexedDB**: Per-conversation mapping storage

## Implementation Status

**MVP COMPLETE!** All 6 core phases implemented:

- ✅ Phase 1: Foundation (logging, storage, DOM utils)
- ✅ Phase 2: Input Overlay (React + state machine)
- ✅ Phase 3: LLM Integration (local LLM client)
- ✅ Phase 4: Review Overlay (interactive redaction review)
- ✅ Phase 5: ChatGPT Injection (React state sync + injection)
- ✅ Phase 6: Response De-anonymization (inline replacements)

The core redaction flow is fully functional!

## License

MIT
