/**
 * Foundry's `EditorView#focus` -> `selectionToDOM` throws
 * `Cannot read properties of null (reading 'setSelection')` on every
 * ProseMirror toolbar click in this Foundry build, regardless of scroll
 * layout, render timing, or prior selection state (all ruled out). This is
 * an upstream editor bug, not something fixable via our sheet DOM/CSS.
 * Patch the exact failing method so the error can't propagate as an
 * uncaught exception; the toolbar action still runs after focus() returns.
 */
export function registerProseMirrorFocusGuard() {
  const EditorView = foundry?.prosemirror?.EditorView;
  const original = EditorView?.prototype?.focus;
  if (!original || original.__synthicidePatched) return;

  let hasWarned = false;
  function patchedFocus(...args) {
    try {
      return original.apply(this, args);
    } catch (err) {
      if (!hasWarned) {
        hasWarned = true;
        console.warn('Synthicide | Suppressed ProseMirror EditorView#focus error (further occurrences silenced this session)', err);
      }
    }
  }
  patchedFocus.__synthicidePatched = true;
  EditorView.prototype.focus = patchedFocus;
}
