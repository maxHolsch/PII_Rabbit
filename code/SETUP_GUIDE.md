# PII Shield - Setup Guide

Complete guide to getting PII Shield running locally.

## Prerequisites

1. **Node.js 18+**
   ```bash
   node --version  # Should be 18.x or higher
   ```

2. **LM Studio** (for local LLM)
   - Download from: https://lmstudio.ai/
   - Or use any OpenAI-compatible local LLM server

3. **Chrome/Chromium Browser**

## Step 1: Install Dependencies

```bash
cd /path/to/pii-shield
npm install
```

## Step 2: Set Up Local LLM

### Option A: Using LM Studio (Recommended)

1. Download and install LM Studio
2. Open LM Studio
3. Go to the "Search" tab
4. Search for: `qwen/qwen3-4b-thinking-2507`
5. Download the model (or any other model you prefer)
6. Go to the "Local Server" tab
7. Select your downloaded model
8. Click "Start Server"
9. Verify it's running on `http://localhost:1234`

### Option B: Using Another LLM Server

If using a different server:
1. Ensure it's OpenAI-compatible
2. Note the endpoint URL
3. Update the settings in the extension after installation

## Step 3: Build the Extension

```bash
# Development build (with hot reload)
npm run dev

# Production build
npm run build
```

The built extension will be in the `dist/` directory.

## Step 4: Create Extension Icons

The extension needs icons in these sizes:
- 16x16
- 48x48
- 128x128

Create simple shield icons and place them in:
```
public/icons/icon16.png
public/icons/icon48.png
public/icons/icon128.png
```

**Quick placeholder icons:**
```bash
# On macOS with ImageMagick:
convert -size 16x16 xc:#4f46e5 -pointsize 12 -fill white -annotate +2+12 "🛡" public/icons/icon16.png
convert -size 48x48 xc:#4f46e5 -pointsize 36 -fill white -annotate +6+36 "🛡" public/icons/icon48.png
convert -size 128x128 xc:#4f46e5 -pointsize 96 -fill white -annotate +16+96 "🛡" public/icons/icon128.png
```

## Step 5: Load Extension in Chrome

1. Open Chrome
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist/` directory
6. The PII Shield extension should now appear

## Step 6: Verify Installation

1. **Check extension icon**: Should appear in Chrome toolbar
2. **Click the icon**: Popup should show "Protection active"
3. **Open ChatGPT**: Navigate to https://chatgpt.com
4. **Check console**: Open DevTools (F12), look for `[content:init]` logs
5. **Look for overlay**: You should see the PII Shield input area at the bottom

## Step 7: Test the Flow

1. **Type a message** in the PII Shield input area:
   ```
   Hi, my name is John Smith and I live at 123 Main Street.
   My email is john@example.com.
   ```

2. **Click "Secure & Send"**
   - Should transition to "Analyzing..." state
   - LLM should detect PII
   - Review overlay should appear

3. **Review redactions**
   - Click on highlighted pseudonyms to edit
   - Verify mappings are correct

4. **Click "Approve & Send"**
   - Text should be injected into ChatGPT
   - Message should be sent automatically

5. **Check ChatGPT's response**
   - Pseudonyms should be underlined
   - Hover to see "Sent as: [Person 1]"

## Troubleshooting

### "LLM server not running" error

**Problem**: Extension can't connect to LLM
**Solution**:
- Verify LM Studio server is running on port 1234
- Check the terminal/console in LM Studio for errors
- Try opening `http://localhost:1234` in a browser

### Input overlay not appearing

**Problem**: Shadow DOM not injected
**Solution**:
- Open DevTools Console (F12)
- Look for error messages
- Check that ChatGPT page is fully loaded
- Try refreshing the page

### Send button not working

**Problem**: Injection fails
**Solution**:
- ChatGPT UI may have changed
- Check DevTools Console for errors
- Look for `[injector:error]` logs
- May need to update selectors in `chatgpt-injector.ts`

### Redactions not showing in responses

**Problem**: Mutation observer not detecting messages
**Solution**:
- Check Console for `[content:new-message]` logs
- Verify mappings exist in IndexedDB (DevTools > Application > IndexedDB)
- Try sending another message

## Configuration

### Change LLM Endpoint

1. Open the extension popup
2. Click "Settings" (if available) or:
3. Edit settings in IndexedDB:
   - DevTools > Application > IndexedDB > pii-shield > settings
   - Change `llmEndpoint` to your server URL
   - Change `llmModel` to your model name

### Enable Debug Mode

In DevTools Console:
```javascript
// View all logs
chrome.storage.local.set({ debugMode: true })

// Export logs
console.log(window.eventBus.__logger.exportLogs())
```

## Development Tips

### Watch Mode

```bash
npm run dev
```
This enables hot module reload. Changes to React components will update automatically.

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### View Event Flow

Open DevTools Console and filter by:
- `[content:*]` - Content script events
- `[input:*]` - Input overlay events
- `[redaction:*]` - Redaction service events
- `[review:*]` - Review overlay events
- `[injector:*]` - ChatGPT injection events

## Next Steps

After verifying the MVP works:

1. **Add icons**: Create proper extension icons
2. **Test edge cases**: Long texts, multiple PII types, errors
3. **Improve UX**: Better error messages, loading states
4. **Add features**: File redaction, poison pill, scoring (post-MVP)

## Support

For issues:
1. Check DevTools Console for errors
2. Check this guide's troubleshooting section
3. Review the implementation plan: `IMPLEMENTATION_PLAN.md`
4. Check logs: `logger.exportLogs()` in console
