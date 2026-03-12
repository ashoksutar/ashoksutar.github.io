/**
 * image-classifier.js
 *
 * Uses TensorFlow.js + MobileNet (loaded from CDN) to classify images
 * entirely in the browser — no data leaves the user's device.
 *
 * Model: MobileNet v2 (ImageNet 1000-class)
 * CDN: https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------
  // DOM references
  // ---------------------------------------------------------------
  const uploadArea       = document.getElementById('uploadArea');
  const imageUpload      = document.getElementById('imageUpload');
  const previewImage     = document.getElementById('previewImage');
  const uploadPlaceholder= document.getElementById('uploadPlaceholder');
  const imageUrlInput    = document.getElementById('imageUrlInput');
  const loadUrlBtn       = document.getElementById('loadUrlBtn');
  const classifyBtn      = document.getElementById('classifyBtn');
  const classifierStatus = document.getElementById('classifierStatus');
  const classifierResults= document.getElementById('classifierResults');
  const predictionsList  = document.getElementById('predictionsList');
  const modelLoadingBanner = document.getElementById('modelLoadingBanner');

  let mobileNetModel = null;
  let imageReady     = false;

  // ---------------------------------------------------------------
  // Load MobileNet model eagerly in the background
  // ---------------------------------------------------------------
  async function loadModel() {
    try {
      modelLoadingBanner.classList.remove('hidden');
      // mobilenet is exposed as a global by the CDN script
      mobileNetModel = await mobilenet.load({ version: 2, alpha: 1.0 });
      modelLoadingBanner.classList.add('hidden');
      if (imageReady) classifyBtn.disabled = false;
    } catch (err) {
      modelLoadingBanner.innerHTML =
        '<span style="color:var(--negative)">⚠️ Could not load MobileNet model. Check your internet connection.</span>';
      console.error('MobileNet load error:', err);
    }
  }

  // ---------------------------------------------------------------
  // Show image preview
  // ---------------------------------------------------------------
  function showPreview(src) {
    previewImage.src = src;
    previewImage.hidden = false;
    uploadPlaceholder.style.display = 'none';
    imageReady = true;
    if (mobileNetModel) classifyBtn.disabled = false;
    // Clear previous results
    classifierStatus.hidden = true;
    classifierResults.hidden = true;
  }

  // ---------------------------------------------------------------
  // File input → preview
  // ---------------------------------------------------------------
  uploadArea.addEventListener('click', () => imageUpload.click());
  uploadArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') imageUpload.click();
  });

  imageUpload.addEventListener('change', () => {
    const file = imageUpload.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showStatus(classifierStatus, 'Please upload an image file.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => showPreview(e.target.result);
    reader.readAsDataURL(file);
  });

  // ---------------------------------------------------------------
  // Drag & drop
  // ---------------------------------------------------------------
  uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
  });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => showPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  });

  // ---------------------------------------------------------------
  // URL input → preview
  // ---------------------------------------------------------------
  loadUrlBtn.addEventListener('click', () => {
    const url = imageUrlInput.value.trim();
    if (!url) return;
    // Load the image directly. Cross-origin images may trigger a CORS error
    // from TensorFlow.js when it tries to read pixel data; in that case an
    // error is shown to the user and they can upload the image locally instead.
    showPreview(url);
    imageUrlInput.value = '';
  });

  imageUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loadUrlBtn.click();
  });

  // ---------------------------------------------------------------
  // Classify
  // ---------------------------------------------------------------
  classifyBtn.addEventListener('click', async () => {
    if (!mobileNetModel || !imageReady) return;

    classifyBtn.disabled = true;
    classifierResults.hidden = true;
    showStatus(classifierStatus, '🔍 Analysing image…', 'loading');

    try {
      const predictions = await mobileNetModel.classify(previewImage, 5);
      renderPredictions(predictions);
      classifierStatus.hidden = true;
    } catch (err) {
      showStatus(
        classifierStatus,
        '⚠️ Could not classify image. Make sure the image loaded correctly.',
        'error'
      );
      console.error('Classification error:', err);
    } finally {
      classifyBtn.disabled = false;
    }
  });

  // ---------------------------------------------------------------
  // Render predictions
  // ---------------------------------------------------------------
  function renderPredictions(predictions) {
    predictionsList.innerHTML = '';
    predictions.forEach((p) => {
      const pct = Math.round(p.probability * 100);
      const label = formatLabel(p.className);
      const li = document.createElement('li');
      li.className = 'prediction-item';
      li.innerHTML = `
        <div class="prediction-header">
          <span class="prediction-name">${label}</span>
          <span class="prediction-score">${pct}%</span>
        </div>
        <div class="prediction-bar-wrap">
          <div class="prediction-bar" style="width:${pct}%"></div>
        </div>
      `;
      predictionsList.appendChild(li);
    });
    classifierResults.hidden = false;
  }

  // ---------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------
  function formatLabel(raw) {
    // MobileNet labels can be comma-separated alternatives — show first
    return raw.split(',')[0].trim();
  }

  function showStatus(el, message, type) {
    el.className = 'status-box';
    el.classList.add('status-' + type);
    el.innerHTML = (type === 'loading' ? '<div class="spinner"></div>' : '') + message;
    el.hidden = false;
  }

  // ---------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------
  loadModel();
})();
