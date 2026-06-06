// ─── Toast notification system ────────────────────────────────────────────────
// Usage: showError('msg') / showInfo('msg') / showWarning('msg')
// Never use alert(), confirm(), or prompt()

let _container = null;

function getContainer() {
  if (_container) return _container;
  _container = document.createElement('div');
  _container.id = 'spv-toast-container';
  Object.assign(_container.style, {
    position:      'fixed',
    top:           '1rem',
    right:         '1rem',
    zIndex:        '9999',
    display:       'flex',
    flexDirection: 'column',
    gap:           '0.5rem',
    pointerEvents: 'none',
    maxWidth:      '360px',
  });
  document.body.appendChild(_container);
  return _container;
}

const VARIANTS = {
  error:   { bg: '#3b1c22', border: '#f43f5e', icon: '✕', iconColor: '#f43f5e' },
  info:    { bg: '#1a2340', border: '#6366f1', icon: 'ℹ', iconColor: '#818cf8' },
  warning: { bg: '#2a1f0f', border: '#f59e0b', icon: '⚠', iconColor: '#f59e0b' },
  success: { bg: '#0f2a1a', border: '#4ade80', icon: '✓', iconColor: '#4ade80' },
};

function showToast(message, variant = 'info', durationMs = 3500) {
  const v = VARIANTS[variant] ?? VARIANTS.info;
  const container = getContainer();

  const toast = document.createElement('div');
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  Object.assign(toast.style, {
    display:         'flex',
    alignItems:      'flex-start',
    gap:             '0.625rem',
    padding:         '0.75rem 1rem',
    background:      v.bg,
    border:          `1px solid ${v.border}`,
    borderRadius:    '0.5rem',
    boxShadow:       '0 8px 24px rgba(0,0,0,0.5)',
    pointerEvents:   'auto',
    cursor:          'pointer',
    opacity:         '0',
    transform:       'translateX(1rem)',
    transition:      'opacity 0.22s ease, transform 0.22s ease',
    fontFamily:      'Inter, ui-sans-serif, system-ui, sans-serif',
    fontSize:        '13px',
    lineHeight:      '1.5',
    color:           '#e2e8f0',
    backdropFilter:  'blur(8px)',
    maxWidth:        '340px',
    wordBreak:       'break-word',
  });

  const iconEl = document.createElement('span');
  iconEl.textContent = v.icon;
  iconEl.style.color = v.iconColor;
  iconEl.style.fontWeight = '700';
  iconEl.style.flexShrink = '0';
  iconEl.style.lineHeight = '1.5';

  const msgEl = document.createElement('span');
  msgEl.textContent = message;

  toast.appendChild(iconEl);
  toast.appendChild(msgEl);
  container.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Close on click
  toast.addEventListener('click', () => dismiss(toast));

  // Auto-dismiss
  const timer = setTimeout(() => dismiss(toast), durationMs);
  toast._spvTimer = timer;

  function dismiss(el) {
    clearTimeout(el._spvTimer);
    el.style.opacity   = '0';
    el.style.transform = 'translateX(1rem)';
    setTimeout(() => el.remove(), 250);
  }
}

export function showError(message, duration = 4000) {
  showToast(message, 'error', duration);
}

export function showInfo(message, duration = 3000) {
  showToast(message, 'info', duration);
}

export function showWarning(message, duration = 3500) {
  showToast(message, 'warning', duration);
}

export function showSuccess(message, duration = 2500) {
  showToast(message, 'success', duration);
}
