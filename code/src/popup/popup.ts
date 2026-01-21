/**
 * Popup script for extension toggle
 */

const toggle = document.getElementById('enable-toggle') as HTMLInputElement;
const statusElement = document.getElementById('status') as HTMLDivElement;
const clearStorageBtn = document.getElementById('clear-storage') as HTMLButtonElement;

// Load current settings
chrome.runtime.sendMessage({ type: 'settings:get' }, (settings) => {
  toggle.checked = settings.enabled ?? true;
  updateStatus(settings.enabled ?? true);
});

// Handle toggle change
toggle.addEventListener('change', () => {
  const enabled = toggle.checked;

  chrome.runtime.sendMessage(
    {
      type: 'settings:set',
      data: { enabled },
    },
    () => {
      updateStatus(enabled);

      // Notify content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'extension:toggle',
            enabled,
          });
        }
      });
    }
  );
});

function updateStatus(enabled: boolean): void {
  if (enabled) {
    statusElement.textContent = '✓ Protection active';
    statusElement.className = 'status active';
  } else {
    statusElement.textContent = '✗ Protection disabled';
    statusElement.className = 'status inactive';
  }
}

// Handle clear storage button
clearStorageBtn.addEventListener('click', () => {
  if (confirm('Clear all extension storage? This will reset all settings.')) {
    chrome.storage.local.clear(() => {
      alert('Storage cleared! Extension will reload.');
      // Set default settings
      chrome.runtime.sendMessage({
        type: 'settings:set',
        data: {
          enabled: true,
          llmEndpoint: 'http://localhost:1234',
          llmModel: 'qwen/qwen3-4b-thinking-2507',
          autoRedact: true,
          debugMode: false,
        },
      }, () => {
        // Reload popup
        window.location.reload();
      });
    });
  }
});
