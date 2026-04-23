document.addEventListener('DOMContentLoaded', async () => {
  const copyBtn = document.getElementById('copyBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const previewBtn = document.getElementById('previewBtn');
  const clearBtn = document.getElementById('clearBtn');
  const status = document.getElementById('status');
  const preview = document.getElementById('preview');

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  // Update stats on load
  updateStats();

  async function getReport() {
    const options = {
      filter: document.getElementById('errorsOnly').checked ? 'errors-only' : 'all',
      last5Min: document.getElementById('last5Min').checked,
      includeContext: document.getElementById('includeContext').checked
    };

    try {
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: 'getReport',
        options
      });
      return response;
    } catch (e) {
      showStatus('Error: Make sure you\'re on the correct page', 'error');
      return null;
    }
  }

  async function updateStats() {
    const report = await getReport();
    if (!report) return;

    document.getElementById('totalLogs').textContent = report.meta.totalLogs;
    document.getElementById('errorCount').textContent = 
      report.logs.filter(l => l.type === 'error' || l.source === 'error').length;
    document.getElementById('warningCount').textContent = 
      report.logs.filter(l => l.type === 'warn').length;
    document.getElementById('sessionTime').textContent = 
      formatDuration(report.meta.sessionDuration);
  }

  function formatDuration(seconds) {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    setTimeout(() => status.className = 'status', 3000);
  }

  // Copy formatted report
  copyBtn.addEventListener('click', async () => {
    const report = await getReport();
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report.formattedForKimi);
      showStatus('✅ Copied! Paste into Kimi chat now', 'success');
    } catch (err) {
      showStatus('❌ Failed to copy', 'error');
    }
  });

  // Download JSON
  downloadBtn.addEventListener('click', async () => {
    const report = await getReport();
    if (!report) return;

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    showStatus('✅ Report downloaded', 'success');
  });

  // Preview
  previewBtn.addEventListener('click', async () => {
    const report = await getReport();
    if (!report) return;

    preview.textContent = report.formattedForKimi.slice(0, 2000) + '...';
    preview.style.display = preview.style.display === 'none' ? 'block' : 'none';
  });

  // Clear logs
  clearBtn.addEventListener('click', async () => {
    await chrome.tabs.sendMessage(tab.id, { action: 'clearLogs' });
    updateStats();
    showStatus('🗑️ Logs cleared', 'success');
  });
});