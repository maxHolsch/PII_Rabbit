# PII Shield

Chrome extension for protecting privacy in ChatGPT conversations through local PII redaction.

## Features

- **Local PII Redaction**: Uses a local LLM to detect and redact personal information
- **Shadow DOM Overlays**: Non-intrusive UI that survives ChatGPT updates
- **Conversation Mapping**: Maintains pseudonym consistency per conversation
- **Zero Cloud Dependency**: All processing happens locally

## Development Setup

> **⚠️ CRITICAL: Chrome Caching Issue**
> Chrome aggressively caches extensions. The "Reload" button in `chrome://extensions` **DOES NOT work properly** and your code changes may not appear!
>
> **Solution**: Always use `npm run build` and follow the printed reload instructions (Remove → Re-add extension).
> See [Development Workflow](#development-workflow-handling-chrome-caching) below for details.

### Prerequisites

- Node.js 18+
- LM Studio or compatible OpenAI-format LLM server running on `localhost:1234`
- Chrome/Chromium browser

### Installation

```bash
# Install dependencies
npm install

# Build extension
npm run build

# Follow the printed reload instructions!
```

**Build Status**: ✅ Successfully builds to `dist/` folder

### Loading in Chrome (First Time)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist/` directory

### Development Workflow: Handling Chrome Caching

⚠️ **IMPORTANT**: Chrome aggressively caches extensions. Simply clicking "Reload" in `chrome://extensions` **does not clear all caches** and your changes may not appear.

#### Quick Reload (Recommended for Development)

After making code changes, run:

```bash
npm run build
```

This will:
1. Auto-increment the extension version (forces Chrome to reload)
2. Build the extension with TypeScript compilation
3. Display detailed reload instructions

**Critical Step: Disable Chrome's HTTP Cache**

Before following the reload instructions, you MUST disable Chrome's HTTP cache:

1. Open ChatGPT in Chrome
2. Right-click → Inspect (open DevTools)
3. Go to Network tab
4. Check ☑️ "Disable cache" (checkbox at top of Network tab)
5. **Keep DevTools open** while reloading the extension

Then follow the printed reload instructions to properly reload the extension.

#### Manual Reload Steps (If Needed)

If you need to reload manually without the helper script:

1. Make your code changes
2. Run `npm run build`
3. Go to `chrome://extensions/`
4. Find "PII Shield"
5. **Click "Remove"** (NOT "Reload")
6. Click "Load unpacked"
7. Select the `dist/` folder
8. Refresh any open ChatGPT tabs

#### Why "Reload" Button Isn't Enough

Chrome's extension reload button doesn't clear:
- Service worker cache (background scripts)
- Content script cache (in some cases)
- Extension resources and manifests

**Full remove + re-add ensures a clean slate.**

#### Production Builds

For production releases (when you want to manually control the version):

```bash
npm run build:prod
```

This builds without auto-incrementing the version number.

#### Still Not Working?

If your changes still don't appear after following the reload steps:

1. **Clear service worker cache**:
   - Go to `chrome://serviceworker-internals/`
   - Find "PII Shield" entries
   - Click "Unregister" for each one

2. **Hard refresh ChatGPT tabs**:
   - Mac: `Cmd + Shift + R`
   - Windows/Linux: `Ctrl + Shift + R`

3. **Restart Chrome completely**

4. **Check for build errors**:
   ```bash
   npm run type-check
   npm run lint
   ```

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

## Troubleshooting

### My code changes aren't appearing in Chrome!

This is the **#1 most common issue** with Chrome extension development. Chrome has **multiple layers of caching**:
- Extension cache (cleared by Remove → Re-add)
- Service worker cache
- **HTTP cache for JavaScript files** ← This is usually the culprit!

**Quick Fix**:
1. Open ChatGPT tab
2. Right-click → Inspect (open DevTools)
3. Go to Network tab → Check ☑️ "Disable cache"
4. **Keep DevTools open**
5. Run `npm run build`
6. Follow the printed instructions (Remove extension → Re-add it)
7. Refresh ChatGPT tabs (with DevTools still open)

**Why DevTools?** Chrome only disables HTTP caching when DevTools is open with "Disable cache" checked. This is separate from the extension reload!

See [Development Workflow: Handling Chrome Caching](#development-workflow-handling-chrome-caching) for complete details.

### Extension not showing up in chrome://extensions/

Make sure you:
1. Enabled "Developer mode" (toggle in top right)
2. Selected the `dist/` folder (not the root project folder)
3. Built the extension first with `npm run build`

### LLM errors or "Connection refused"

Make sure LM Studio is:
1. Running on `localhost:1234`
2. Has the model loaded: `qwen/qwen3-4b-thinking-2507`
3. Local server is started (check the "Local Server" tab in LM Studio)

### TypeScript errors during build

Run diagnostics:
```bash
npm run type-check
npm run lint
```

## License

MIT
