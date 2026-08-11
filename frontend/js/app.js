/**
 * PFOR Platform — Main Application Module
 * Handles strategy generation form, agent progress animation,
 * report rendering, and copy/print actions.
 */

const API_BASE = 'http://localhost:8000';

// ---------------------------------------------------------------------------
// Agent pipeline configuration
// ---------------------------------------------------------------------------
const AGENTS = [
  { id: 'agent-director',  name: 'Director',  icon: '🎯', label: 'Strategic Analysis' },
  { id: 'agent-marketer',  name: 'Marketer',  icon: '📈', label: 'Market Planning' },
  { id: 'agent-financier', name: 'Financier', icon: '💰', label: 'Financial Modeling' },
  { id: 'agent-editor',    name: 'Editor',    icon: '✍️',  label: 'Report Synthesis' },
];

// Approximate time each agent takes (for progress animation only)
const AGENT_DURATIONS = [8000, 8000, 8000, 6000]; // ms

// ---------------------------------------------------------------------------
// DOM references (resolved at DOMContentLoaded)
// ---------------------------------------------------------------------------
let problemTextarea, charCounter, generateBtn;
let agentsProgress, progressBarFill;
let reportSection, reportContent;

// ---------------------------------------------------------------------------
// Character counter
// ---------------------------------------------------------------------------

/**
 * Update the character counter display below the textarea.
 */
function updateCharCounter() {
  if (!problemTextarea || !charCounter) return;
  const len = problemTextarea.value.length;
  charCounter.textContent = `${len} characters`;
}

// ---------------------------------------------------------------------------
// Toast notifications
// ---------------------------------------------------------------------------

/**
 * Display a toast notification.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3200);
}

// Expose globally so auth.js can use it
window.showToast = showToast;

// ---------------------------------------------------------------------------
// Agent progress animation
// ---------------------------------------------------------------------------

let agentTimers = [];

/**
 * Reset all agent chips to their default idle state.
 */
function resetAgentChips() {
  AGENTS.forEach(agent => {
    const chip = document.getElementById(agent.id);
    if (!chip) return;
    chip.classList.remove('active', 'done');
    chip.querySelector('.agent-status').textContent = 'Waiting...';
  });

  if (progressBarFill) progressBarFill.style.width = '0%';
}

/**
 * Run the agent progress animation sequentially.
 * Each chip activates, then transitions to "done" before the next starts.
 * @returns {Promise<void>}
 */
function animateAgents() {
  return new Promise((resolve) => {
    agentTimers.forEach(clearTimeout);
    agentTimers = [];
    resetAgentChips();

    let elapsed = 0;
    const totalDuration = AGENT_DURATIONS.reduce((a, b) => a + b, 0);

    AGENTS.forEach((agent, index) => {
      const duration = AGENT_DURATIONS[index];

      // Activate agent
      const startTimer = setTimeout(() => {
        const chip = document.getElementById(agent.id);
        if (!chip) return;
        chip.classList.add('active');
        chip.querySelector('.agent-status').textContent = 'Analyzing...';

        // Update progress bar
        const progress = ((elapsed + duration * 0.5) / totalDuration) * 100;
        if (progressBarFill) progressBarFill.style.width = `${progress}%`;
      }, elapsed);

      agentTimers.push(startTimer);

      // Mark agent as done
      const endTimer = setTimeout(() => {
        const chip = document.getElementById(agent.id);
        if (!chip) return;
        chip.classList.remove('active');
        chip.classList.add('done');
        chip.querySelector('.agent-status').textContent = 'Complete ✓';

        // Final progress update after last agent
        if (index === AGENTS.length - 1) {
          if (progressBarFill) progressBarFill.style.width = '100%';
          setTimeout(resolve, 400);
        }
      }, elapsed + duration - 400);

      agentTimers.push(endTimer);
      elapsed += duration;
    });
  });
}

/**
 * Stop all running agent animations immediately.
 */
function stopAgentAnimation() {
  agentTimers.forEach(clearTimeout);
  agentTimers = [];
}

// ---------------------------------------------------------------------------
// Markdown to HTML renderer (lightweight)
// ---------------------------------------------------------------------------

/**
 * Convert a markdown string to safe HTML for display in the report.
 * Supports: headings, bold, italic, code, tables, lists, blockquotes, hr.
 * @param {string} md
 * @returns {string}
 */
function renderMarkdown(md) {
  let html = md
    // Escape HTML entities first (security)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headings
    .replace(/^#{6}\s(.+)$/gm, '<h6>$1</h6>')
    .replace(/^#{5}\s(.+)$/gm, '<h5>$1</h5>')
    .replace(/^#{4}\s(.+)$/gm, '<h4>$1</h4>')
    .replace(/^#{3}\s(.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2}\s(.+)$/gm, '<h2>$1</h2>')
    .replace(/^#{1}\s(.+)$/gm, '<h1>$1</h1>')

    // Bold + Italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')

    // Horizontal rules
    .replace(/^---+$/gm, '<hr>')

    // Blockquotes
    .replace(/^&gt;\s(.+)$/gm, '<blockquote>$1</blockquote>')

    // Unordered lists
    .replace(/^\s*[-*]\s+\[x\]\s(.+)$/gm, '<li class="checked">☑ $1</li>')
    .replace(/^\s*[-*]\s+\[ \]\s(.+)$/gm, '<li class="unchecked">☐ $1</li>')
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>')

    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/(<li>[\s\S]*?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

  // Tables
  html = html.replace(/(\|.+\|[\r\n]+\|[-| :]+\|[\r\n]+(?:\|.+\|[\r\n]*)+)/g, (table) => {
    const rows = table.trim().split('\n');
    const headerCells = rows[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const bodyRows = rows.slice(2).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Paragraphs (lines separated by blank lines)
  html = html
    .split(/\n{2,}/)
    .map(block => {
      block = block.trim();
      if (!block) return '';
      // Don't wrap block-level elements
      if (/^<(h[1-6]|ul|ol|li|table|blockquote|hr|pre)/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('\n');

  return html;
}

// ---------------------------------------------------------------------------
// Strategy generation
// ---------------------------------------------------------------------------

/**
 * Call the backend API to generate a strategy report.
 * @param {string} problem
 * @returns {Promise<Object>} - API response object
 */
async function apiGenerateStrategy(problem) {
  const token = window.PforAuth?.getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/strategy/generate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ problem_statement: problem }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || 'Failed to generate strategy report.');
  }
  return data;
}

/**
 * Main handler for the "Generate Strategy" button click.
 */
async function handleGenerateStrategy() {
  const problem = problemTextarea?.value.trim();

  if (!problem || problem.length < 20) {
    showToast('Please describe your problem in at least 20 characters.', 'error');
    problemTextarea?.focus();
    return;
  }

  // Show progress, hide old report
  generateBtn.disabled = true;
  generateBtn.textContent = 'Generating…';
  agentsProgress.classList.add('visible');
  reportSection.classList.remove('visible');

  // Start animation and API call concurrently
  try {
    const [reportData] = await Promise.all([
      apiGenerateStrategy(problem),
      animateAgents(),
    ]);

    // Render the report
    displayReport(reportData);
    showToast('Strategy report generated! 🎉', 'success');
  } catch (err) {
    stopAgentAnimation();
    resetAgentChips();
    agentsProgress.classList.remove('visible');
    showToast(`Error: ${err.message}`, 'error');
    console.error('Strategy generation error:', err);
  } finally {
    generateBtn.disabled = false;
    generateBtn.textContent = 'Сформировать стратегию';
  }
}

// ---------------------------------------------------------------------------
// Report display
// ---------------------------------------------------------------------------

/**
 * Render and display the strategy report.
 * @param {Object} reportData - API response
 */
function displayReport(reportData) {
  agentsProgress.classList.remove('visible');
  reportSection.classList.add('visible');

  const html = renderMarkdown(reportData.result_report || '');
  reportContent.innerHTML = html;

  // Smooth scroll to report
  reportSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Set report metadata
  const reportMeta = document.getElementById('report-meta-date');
  if (reportMeta) {
    const date = new Date(reportData.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    reportMeta.textContent = `Generated on ${date}`;
  }
}

// ---------------------------------------------------------------------------
// Copy & Print actions
// ---------------------------------------------------------------------------

/**
 * Copy the raw report text to clipboard.
 */
function copyReport() {
  const text = reportContent?.innerText || '';
  if (!text) return;

  navigator.clipboard.writeText(text)
    .then(() => showToast('Report copied to clipboard! 📋', 'success'))
    .catch(() => showToast('Could not copy — please select text manually.', 'error'));
}

/**
 * Open the browser print dialog to print the report.
 */
function printReport() {
  window.print();
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  // Resolve DOM references
  problemTextarea = document.getElementById('problem-textarea');
  charCounter     = document.getElementById('char-counter');
  generateBtn     = document.getElementById('generate-btn');
  agentsProgress  = document.getElementById('agents-progress');
  progressBarFill = document.getElementById('progress-bar-fill');
  reportSection   = document.getElementById('report-section');
  reportContent   = document.getElementById('report-content');

  // Character counter
  problemTextarea?.addEventListener('input', updateCharCounter);
  updateCharCounter();

  // Generate button
  generateBtn?.addEventListener('click', handleGenerateStrategy);

  // Enter key in textarea (Ctrl/Cmd + Enter)
  problemTextarea?.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGenerateStrategy();
    }
  });

  // Copy & Print buttons
  document.getElementById('copy-report-btn')?.addEventListener('click', copyReport);
  document.getElementById('print-report-btn')?.addEventListener('click', printReport);

  // New report button
  document.getElementById('new-report-btn')?.addEventListener('click', () => {
    reportSection.classList.remove('visible');
    problemTextarea.value = '';
    updateCharCounter();
    problemTextarea.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});
