// Shared UI helpers: toasts + button loading states
function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function setLoading(button, isLoading) {
  button.disabled = isLoading;
  button.classList.toggle('loading', isLoading);
}

function stockPercent(available, cap = 20) {
  const pct = Math.min(100, (available / cap) * 100);
  return Math.max(6, pct); // never fully invisible
}

// Security: Escapes user text to prevent XSS attacks when inserting into innerHTML
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Client-side image compression: resizes photo to max width 640px and returns JPEG data URL (quality 0.7)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    // Basic verification that selected file is an image
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 640;
        let width = img.width;
        let height = img.height;

        // Scale down proportionally if wider than maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas drawing to JPEG data URL at 0.7 quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(dataUrl);
      };

      img.onerror = () => reject(new Error('Could not load image'));
      img.src = event.target.result;
    };

    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
}