import type { ResumeContent, ResumeDto, ResumeTheme } from '@folioforge/shared';
import { produce, type Draft } from 'immer';
import { create } from 'zustand';

/** Everything the user edits. Undo/redo and autosave operate on this snapshot. */
export interface EditorDoc {
  title: string;
  content: ResumeContent;
  theme: ResumeTheme;
}

export const HISTORY_LIMIT = 100;
/** Edits to the same field within this window merge into one undo step (typing a word is one step, not ten). */
export const COALESCE_MS = 1_000;

export interface EditorState {
  resumeId: string | null;
  doc: EditorDoc | null;
  /** Server revision the next save is based on (optimistic concurrency). */
  revision: number;
  /** Increments on every document change; autosave compares it with `savedChangeId`. */
  changeId: number;
  savedChangeId: number;
  /** Increments when the document changes from outside the forms (undo, redo, restore), so forms remount with new values. */
  formKey: number;
  past: EditorDoc[];
  future: EditorDoc[];
  lastGroup: string | null;
  lastChangeAt: number;

  load: (resume: ResumeDto) => void;
  update: (recipe: (draft: Draft<EditorDoc>) => void, group?: string) => void;
  undo: () => void;
  redo: () => void;
  markSaved: (changeId: number, revision: number) => void;
  setRevision: (revision: number) => void;
}

const initial = {
  resumeId: null,
  doc: null,
  revision: 0,
  changeId: 0,
  savedChangeId: 0,
  formKey: 0,
  past: [],
  future: [],
  lastGroup: null,
  lastChangeAt: 0,
};

export const useEditorStore = create<EditorState>((set, get) => ({
  ...initial,

  load: (resume) =>
    set((state) => ({
      ...initial,
      resumeId: resume.id,
      doc: { title: resume.title, content: resume.content, theme: resume.theme },
      revision: resume.revision,
      formKey: state.formKey + 1,
    })),

  update: (recipe, group) => {
    const { doc, past, lastGroup, lastChangeAt, changeId } = get();
    if (!doc) return;
    const next = produce(doc, recipe);
    if (next === doc) return; // The recipe changed nothing.
    const now = Date.now();
    const coalesce = group !== undefined && group === lastGroup && now - lastChangeAt < COALESCE_MS;
    set({
      doc: next,
      past: coalesce ? past : [...past, doc].slice(-HISTORY_LIMIT),
      future: [],
      lastGroup: group ?? null,
      lastChangeAt: now,
      changeId: changeId + 1,
    });
  },

  undo: () => {
    const { doc, past, future, changeId, formKey } = get();
    const previous = past[past.length - 1];
    if (!doc || !previous) return;
    set({
      doc: previous,
      past: past.slice(0, -1),
      future: [doc, ...future],
      lastGroup: null,
      changeId: changeId + 1,
      formKey: formKey + 1,
    });
  },

  redo: () => {
    const { doc, past, future, changeId, formKey } = get();
    const next = future[0];
    if (!doc || !next) return;
    set({
      doc: next,
      past: [...past, doc],
      future: future.slice(1),
      lastGroup: null,
      changeId: changeId + 1,
      formKey: formKey + 1,
    });
  },

  markSaved: (changeId, revision) => set({ savedChangeId: changeId, revision }),
  setRevision: (revision) => set({ revision }),
}));

export const selectCanUndo = (s: EditorState) => s.past.length > 0;
export const selectCanRedo = (s: EditorState) => s.future.length > 0;
export const selectIsDirty = (s: EditorState) => s.changeId !== s.savedChangeId;
