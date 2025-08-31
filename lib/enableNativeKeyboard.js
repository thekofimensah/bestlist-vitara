// keyboardEnhancements.js
// Drop-in enhancements for Android WebView + Capacitor + React (plain JS)

var TEXT_INPUT_SELECTOR =
  'input:not([type]), input[type="text"], input[type="search"], textarea, [contenteditable="true"]';

var SKIP_TYPES = new Set([
  'password',
  'email',
  'url',
  'number',
  'tel',
  'datetime-local',
  'date',
]);

function isEditable(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.getAttribute('contenteditable') === 'true') return true;
  if (el.matches('input, textarea')) return true;
  return false;
}

function applyNativeAttributes(element) {
  if (!(element instanceof HTMLElement)) return;

  // Skip hidden/disabled
  if (element.disabled) return;
  if (element.offsetParent === null && getComputedStyle(element).position !== 'fixed') return;

  // Skip types that shouldn't be corrected/capitalized
  if (element.tagName === 'INPUT') {
    var type = (element.getAttribute('type') || 'text').toLowerCase();
    if (SKIP_TYPES.has(type)) return;
  }

  // Enable native features
  element.setAttribute('autocorrect', 'on');
  element.setAttribute('autocapitalize', 'sentences');
  element.setAttribute('spellcheck', 'true');

  // Respect explicit inputmode; allow better keyboards for search
  var t = (element.getAttribute && element.getAttribute('type') || 'text').toLowerCase();
  if (!element.hasAttribute('inputmode') && t !== 'search') {
    element.setAttribute('inputmode', 'text');
  }

  // Keep touch/selection native on the field itself (doesn't create layers)
  var style = element.style || {};
  if (!style.touchAction) style.touchAction = 'auto';
  if (!element.hasAttribute('data-selection-managed')) {
    if (!style.webkitUserSelect) style.webkitUserSelect = 'text';
    if (!style.userSelect) style.userSelect = 'text';
    if (!style.webkitTouchCallout) style.webkitTouchCallout = 'default';
  }
}

function applyToExistingFields() {
  document.querySelectorAll(TEXT_INPUT_SELECTOR).forEach(applyNativeAttributes);
}

/**
 * enableNativeKeyboardEnhancements
 * - Turns on native keyboard attributes
 * - Toggles body.is-editing while focused
 * - Observes DOM for dynamic fields
 * Returns a teardown function.
 */
export function enableNativeKeyboardEnhancements() {
  applyToExistingFields();

  function onFocusIn(e) {
    var t = e.target;
    if (!t) return;
    if (isEditable(t)) {
      document.body.classList.add('is-editing');
      if (!t.isContentEditable) applyNativeAttributes(t);
    }
  }

  function onFocusOut() {
    // Defer one tick so Android's selection menu can close cleanly
    setTimeout(function () {
      document.body.classList.remove('is-editing');
    }, 0);
  }

  document.addEventListener('focusin', onFocusIn, { passive: true });
  document.addEventListener('focusout', onFocusOut);

  var observer = new MutationObserver(function (mutations) {
    for (var i = 0; i < mutations.length; i++) {
      var m = mutations[i];
      m.addedNodes.forEach(function (node) {
        if (!(node instanceof Element)) return;
        if (node.matches && node.matches(TEXT_INPUT_SELECTOR)) applyNativeAttributes(node);
        if (node.querySelectorAll) {
          node.querySelectorAll(TEXT_INPUT_SELECTOR).forEach(applyNativeAttributes);
        }
      });
    }
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });

  return function teardown() {
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    observer.disconnect();
  };
}

/**
 * useNativeKeyboardEnhancements (React-friendly in plain JS)
 * Call inside a React component to auto-enable on mount.
 * Works without JSX (uses React.useEffect).
 */
export function useNativeKeyboardEnhancements() {
  if (!window.React || !React.useEffect) {
    // Not in React context; nothing to do
    return;
  }
  React.useEffect(function () {
    var teardown = enableNativeKeyboardEnhancements();
    return function () { teardown(); };
  }, []);
}

/**
 * PortalEditor (optional diagnostic)
 * Renders a bare textarea directly under <body> to test outside your layout.
 * No JSX; uses React.createElement + ReactDOM.createPortal.
 */
export function PortalEditor(props) {
  if (!window.React || !window.ReactDOM) return null;
  var open = !!(props && props.open);
  var placeholder = (props && props.placeholder) || 'Portal editor probe…';
  if (typeof document === 'undefined' || !open) return null;

  return ReactDOM.createPortal(
    React.createElement('textarea', {
      autoFocus: true,
      placeholder: placeholder,
      onFocus: function () { document.body.classList.add('is-editing'); },
      onBlur: function () { document.body.classList.remove('is-editing'); },
      style: {
        position: 'fixed',
        inset: 16,
        zIndex: 2147483647,
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: 12,
        padding: 12,
        fontSize: 16,
        lineHeight: 1.4
      }
    }),
    document.body
  );
}

// Also expose a UMD-style global for convenience if you just <script> this file
if (typeof window !== 'undefined') {
  window.KeyboardEnhancements = {
    enableNativeKeyboardEnhancements,
    useNativeKeyboardEnhancements,
    PortalEditor
  };
}