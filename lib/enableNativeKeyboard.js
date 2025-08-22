// Ensures native keyboard features (autocorrect, autocapitalize, swipe typing)
// are enabled for all text fields inside the WebView by setting the correct
// attributes and avoiding accidental overrides.

const TEXT_INPUT_SELECTOR = 'input:not([type]), input[type="text"], input[type="search"], textarea';

function applyNativeAttributes(element) {
  if (!element) return;

  // Skip fields that should not be corrected/capitalized
  const type = (element.getAttribute('type') || 'text').toLowerCase();
  const skipTypes = new Set(['password', 'email', 'url', 'number', 'tel', 'datetime-local', 'date']);
  if (skipTypes.has(type)) return;

  // Explicitly enable native features
  element.setAttribute('autocorrect', 'on');
  element.setAttribute('autocapitalize', 'sentences');
  element.setAttribute('spellcheck', 'true');

  // Ensure browser uses a text keyboard (do not override developers' explicit inputmode)
  if (!element.hasAttribute('inputmode')) {
    element.setAttribute('inputmode', 'text');
  }

  // Critical for Android glide typing: allow default touch handling
  // Respect component-level overrides: if data-selection-managed is present, don't force selection/callout styles
  try {
    element.style.touchAction = element.style.touchAction || 'auto';
    if (!element.hasAttribute('data-selection-managed')) {
      if (!element.style.webkitUserSelect) element.style.webkitUserSelect = 'text';
      if (!element.style.userSelect) element.style.userSelect = 'text';
      if (!element.style.webkitTouchCallout) element.style.webkitTouchCallout = 'default';
    }
  } catch {}
}

function applyToExistingFields() {
  document.querySelectorAll(TEXT_INPUT_SELECTOR).forEach(applyNativeAttributes);
}

export function enableNativeKeyboardEnhancements() {
  // Apply to current DOM
  applyToExistingFields();

  // On focus, re-apply to guard against dynamic attributes
  const onFocusIn = (e) => {
    const target = e.target;
    if (target && (target.matches(TEXT_INPUT_SELECTOR) || target.isContentEditable)) {
      if (!target.isContentEditable) {
        applyNativeAttributes(target);
      }
    }
  };
  document.addEventListener('focusin', onFocusIn, { passive: true });

  // Watch for dynamically added inputs
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches && node.matches(TEXT_INPUT_SELECTOR)) {
          applyNativeAttributes(node);
        }
        node.querySelectorAll && node.querySelectorAll(TEXT_INPUT_SELECTOR).forEach(applyNativeAttributes);
      });
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  // Return a teardown function if needed by caller
  return () => {
    document.removeEventListener('focusin', onFocusIn);
    observer.disconnect();
  };
}

export default enableNativeKeyboardEnhancements;



