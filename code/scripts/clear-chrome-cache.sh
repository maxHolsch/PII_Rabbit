#!/bin/bash

# Script to clear Chrome extension cache for PII Shield
# This solves the issue where Chrome serves old cached JavaScript files

echo "🧹 PII Shield - Chrome Cache Cleaner"
echo "======================================"
echo ""

# Check if Chrome is running
if pgrep -x "Google Chrome" > /dev/null; then
    echo "⚠️  Chrome is running!"
    echo "   You must close Chrome completely before running this script."
    echo ""
    echo "   Steps:"
    echo "   1. Close all Chrome windows"
    echo "   2. Run this script again"
    echo "   3. Restart Chrome and load the extension"
    echo ""
    exit 1
fi

# Chrome extensions directory
CHROME_EXT_DIR="$HOME/Library/Application Support/Google/Chrome/Default/Extensions"

if [ ! -d "$CHROME_EXT_DIR" ]; then
    echo "❌ Chrome extensions directory not found!"
    echo "   Expected: $CHROME_EXT_DIR"
    echo ""
    exit 1
fi

echo "📁 Chrome Extensions Directory:"
echo "   $CHROME_EXT_DIR"
echo ""

echo "🔍 Looking for PII Shield extension..."
echo ""

# List all extension folders and their manifests
found=0
for ext_dir in "$CHROME_EXT_DIR"/*; do
    if [ -d "$ext_dir" ]; then
        # Check each version folder for manifest.json
        for version_dir in "$ext_dir"/*; do
            if [ -d "$version_dir" ]; then
                manifest="$version_dir/manifest.json"
                if [ -f "$manifest" ]; then
                    # Check if this is PII Shield
                    if grep -q '"PII Shield"' "$manifest" 2>/dev/null; then
                        echo "✅ Found PII Shield!"
                        echo "   Extension ID: $(basename "$ext_dir")"
                        echo "   Version: $(basename "$version_dir")"
                        echo "   Path: $ext_dir"
                        echo ""

                        read -p "   Delete this extension cache? (y/n) " -n 1 -r
                        echo ""

                        if [[ $REPLY =~ ^[Yy]$ ]]; then
                            rm -rf "$ext_dir"
                            echo "   ✅ Cache deleted successfully!"
                            echo ""
                            found=1
                        else
                            echo "   ⏭️  Skipped"
                            echo ""
                        fi
                    fi
                fi
            fi
        done
    fi
done

if [ $found -eq 0 ]; then
    echo "ℹ️  PII Shield extension cache not found"
    echo "   This might mean:"
    echo "   - Extension was never installed"
    echo "   - Extension was already removed"
    echo "   - Extension is in a different Chrome profile"
    echo ""
fi

echo "======================================"
echo "✅ Done!"
echo ""
echo "Next steps:"
echo "1. Restart Chrome"
echo "2. Go to chrome://extensions/"
echo "3. Load unpacked extension from dist/"
echo "4. Test your changes"
echo ""
