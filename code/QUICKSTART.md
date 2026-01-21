# Quick Start - Get Running in 5 Minutes

## TL;DR

```bash
# 1. Install dependencies
npm install

# 2. Build
npm run build

# 3. Load extension
# Chrome → chrome://extensions → Enable Developer Mode → Load unpacked → Select dist/

# 4. Start LM Studio
# Open LM Studio → Local Server → Start Server (port 1234)

# 5. Test
# Visit chatgpt.com → Type in PII Shield input → Click "Secure & Send"
```

## Detailed Steps

### 1. Install & Build (2 min)

```bash
cd /path/to/code
npm install
npm run build
```

### 2. Add Placeholder Icons (30 sec)

For now, just create simple colored squares:

```bash
# Create basic icons
mkdir -p public/icons
echo "Add icon16.png, icon48.png, icon128.png here"
```

Or skip and accept broken icon images for testing.

### 3. Load in Chrome (1 min)

1. Open `chrome://extensions/`
2. Toggle "Developer mode" ON (top right)
3. Click "Load unpacked"
4. Select the `dist/` folder
5. Extension appears in toolbar

### 4. Start LM Studio (1 min)

1. Open LM Studio (download from lmstudio.ai if needed)
2. Go to "Local Server" tab
3. Select any model (qwen recommended)
4. Click "Start Server"
5. Verify URL shows `http://localhost:1234`

### 5. Test (1 min)

1. Go to https://chatgpt.com
2. You should see PII Shield input at bottom
3. Type: `Hi, I'm John Smith from 123 Main St`
4. Click "Secure & Send"
5. Should show review modal with detected PII
6. Click "Approve & Send"
7. Message goes to ChatGPT with redactions
8. Response shows real names underlined

## Troubleshooting

**"LLM server not running"**
→ Start LM Studio server on port 1234

**Input not appearing**
→ Refresh ChatGPT page, check Console for errors

**Send not working**
→ Check Console logs, ChatGPT UI may have changed

**No de-anonymization**
→ Check IndexedDB has mappings (DevTools → Application → IndexedDB)

## Success Indicators

✓ Extension icon in Chrome toolbar
✓ PII Shield input visible on chatgpt.com
✓ Console shows `[content:init]` logs
✓ LLM server responds (check LM Studio)
✓ Review modal appears after submit
✓ Text injected into ChatGPT
✓ Responses show underlined names

## Next?

See `SETUP_GUIDE.md` for detailed setup and troubleshooting.
See `MVP_COMPLETE.md` for architecture and what was built.
