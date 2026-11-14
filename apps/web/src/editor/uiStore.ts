import { create } from 'zustand';

/** View state of the editor (which cards are open). Not part of the document, so not undoable. */
interface EditorUiState {
  expanded: Record<string, boolean>;
  /** Items created in this session: their empty required fields should not shout errors immediately. */
  fresh: Record<string, boolean>;
  setExpanded: (id: string, open: boolean) => void;
  toggle: (id: string) => void;
  markFresh: (id: string) => void;
  reset: () => void;
}

export const useEditorUi = create<EditorUiState>((set) => ({
  expanded: {},
  fresh: {},
  setExpanded: (id, open) => set((s) => ({ expanded: { ...s.expanded, [id]: open } })),
  toggle: (id) => set((s) => ({ expanded: { ...s.expanded, [id]: !s.expanded[id] } })),
  markFresh: (id) => set((s) => ({ fresh: { ...s.fresh, [id]: true } })),
  reset: () => set({ expanded: {}, fresh: {} }),
}));

/** Stable DOM id for a form field, so validation issues can link to it. */
export const fieldId = (ownerId: string, field: string) =>
  `f-${ownerId}-${field.replace(/\./g, '-')}`;

/** Focuses an element once React has rendered it (e.g. after expanding a card). */
export function focusWhenReady(id: string, attempts = 10): void {
  const tryFocus = (left: number) => {
    const element = document.getElementById(id);
    if (element) {
      element.focus();
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (left > 0) {
      requestAnimationFrame(() => tryFocus(left - 1));
    }
  };
  requestAnimationFrame(() => tryFocus(attempts));
}
