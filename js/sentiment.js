/**
 * sentiment.js
 *
 * Performs sentiment analysis using the HuggingFace free Inference API.
 *
 * Model : distilbert-base-uncased-finetuned-sst-2-english
 * Endpoint: https://api-inference.huggingface.co/models/<model-id>
 *
 * The HuggingFace Inference API is free-to-use with public models at a
 * modest rate limit — no API key is required for anonymous requests.
 * Users can optionally supply their own HuggingFace API token (stored only
 * in sessionStorage, never persisted) to get a higher rate limit.
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // Constants
  // ---------------------------------------------------------------
  const HF_API_URL =
    'https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english';

  const MAX_CHARS = 512;

  // ---------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------
  const sentimentInput  = document.getElementById('sentimentInput');
  const charCount       = document.getElementById('charCount');
  const analyseBtn      = document.getElementById('analyseBtn');
  const sentimentStatus = document.getElementById('sentimentStatus');
  const sentimentResult = document.getElementById('sentimentResult');
  const sentimentLabel  = document.getElementById('sentimentLabel');
  const confidenceBar   = document.getElementById('confidenceBar');
  const confidenceValue = document.getElementById('confidenceValue');
  const sentimentDetail = document.getElementById('sentimentDetail');
  const hfTokenInput    = document.getElementById('hfTokenInput');
  const saveTokenBtn    = document.getElementById('saveTokenBtn');
  const clearTokenBtn   = document.getElementById('clearTokenBtn');

  // ---------------------------------------------------------------
  // HuggingFace API token management (sessionStorage only)
  // Token is restored each session; save/clear buttons allow the user
  // to supply their own free token from huggingface.co/settings/tokens
  // to bypass rate-limit restrictions on the anonymous free tier.
  // ---------------------------------------------------------------
  const existingToken = window.sessionStorage.getItem('hf_token');
  if (existingToken && hfTokenInput) hfTokenInput.value = existingToken;

  if (saveTokenBtn) {
    saveTokenBtn.addEventListener('click', () => {
      const t = hfTokenInput.value.trim();
      if (t) {
        window.sessionStorage.setItem('hf_token', t);
        showStatus(sentimentStatus, '✅ Token saved for this session.', 'info');
      }
    });
  }

  if (clearTokenBtn) {
    clearTokenBtn.addEventListener('click', () => {
      window.sessionStorage.removeItem('hf_token');
      if (hfTokenInput) hfTokenInput.value = '';
      showStatus(sentimentStatus, '🗑️ Token cleared.', 'info');
    });
  }

  // ---------------------------------------------------------------
  // Character counter
  // ---------------------------------------------------------------
  sentimentInput.addEventListener('input', () => {
    const len = sentimentInput.value.length;
    charCount.textContent = len;
    if (len > MAX_CHARS) {
      sentimentInput.value = sentimentInput.value.slice(0, MAX_CHARS);
      charCount.textContent = MAX_CHARS;
    }
  });

  // ---------------------------------------------------------------
  // Example chips
  // ---------------------------------------------------------------
  document.querySelectorAll('.chip[data-text]').forEach((chip) => {
    chip.addEventListener('click', () => {
      sentimentInput.value = chip.dataset.text;
      charCount.textContent = chip.dataset.text.length;
    });
  });

  // ---------------------------------------------------------------
  // Analyse button
  // ---------------------------------------------------------------
  analyseBtn.addEventListener('click', runAnalysis);
  sentimentInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) runAnalysis();
  });

  async function runAnalysis() {
    const text = sentimentInput.value.trim();
    if (!text) {
      showStatus(sentimentStatus, 'Please enter some text first.', 'error');
      return;
    }

    analyseBtn.disabled = true;
    sentimentResult.hidden = true;
    showStatus(sentimentStatus, '💬 Analysing sentiment…', 'loading');

    try {
      const result = await querySentimentAPI(text);
      renderResult(result);
      sentimentStatus.hidden = true;
    } catch (err) {
      const msg = err.message || 'Unknown error';
      if (msg.includes('loading')) {
        showStatus(
          sentimentStatus,
          '⏳ Model is warming up on HuggingFace servers. Please try again in a few seconds.',
          'info'
        );
      } else {
        showStatus(
          sentimentStatus,
          '⚠️ Could not reach the sentiment API. ' + msg,
          'error'
        );
      }
      console.error('Sentiment API error:', err);
    } finally {
      analyseBtn.disabled = false;
    }
  }

  // ---------------------------------------------------------------
  // HuggingFace Inference API call
  // ---------------------------------------------------------------
  async function querySentimentAPI(text) {
    const headers = { 'Content-Type': 'application/json' };

    // Allow optional user-supplied token stored in sessionStorage
    const token = window.sessionStorage.getItem('hf_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      if (body.error && body.error.toLowerCase().includes('loading')) {
        throw new Error('loading');
      }
      throw new Error(`HTTP ${response.status}: ${body.error || response.statusText}`);
    }

    // Response shape: [[{label,score},{label,score}]]
    const data = await response.json();
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error('Unexpected API response shape.');
    }

    // Find the highest-scoring label
    const predictions = data[0];
    const top = predictions.reduce((a, b) => (a.score > b.score ? a : b));
    return top;
  }

  // ---------------------------------------------------------------
  // Render result
  // ---------------------------------------------------------------
  function renderResult({ label, score }) {
    const isPositive = label.toUpperCase() === 'POSITIVE';
    const pct = Math.round(score * 100);

    // Label pill
    sentimentLabel.className = 'sentiment-label';
    if (isPositive) {
      sentimentLabel.classList.add('label-positive');
      sentimentLabel.textContent = '😊 POSITIVE';
    } else {
      sentimentLabel.classList.add('label-negative');
      sentimentLabel.textContent = '😞 NEGATIVE';
    }

    // Confidence bar
    confidenceBar.className = 'confidence-bar ' + (isPositive ? 'positive-bar' : 'negative-bar');
    confidenceBar.style.width = pct + '%';
    confidenceValue.textContent = pct + '%';

    // Detail text
    sentimentDetail.textContent =
      'The model is ' + pct + '% confident the text expresses a ' +
      (isPositive ? 'positive' : 'negative') + ' sentiment.';

    sentimentResult.hidden = false;
  }

  // ---------------------------------------------------------------
  // Status helper (shared logic, mirrors image-classifier.js)
  // ---------------------------------------------------------------
  function showStatus(el, message, type) {
    el.className = 'status-box';
    el.classList.add('status-' + type);
    el.innerHTML = (type === 'loading' ? '<div class="spinner"></div>' : '') + message;
    el.hidden = false;
  }
})();
