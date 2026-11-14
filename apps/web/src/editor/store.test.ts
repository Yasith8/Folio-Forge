import { SAMPLE_RESUME_CONTENT, SAMPLE_RESUME_THEME, type ResumeDto } from '@folioforge/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editorActions, moveInArray } from './actions';
import {
  COALESCE_MS,
  HISTORY_LIMIT,
  selectCanRedo,
  selectCanUndo,
  selectIsDirty,
  useEditorStore,
} from './store';

const resume: ResumeDto = {
  id: 'resume-1',
  title: 'Frontend roles',
  content: SAMPLE_RESUME_CONTENT,
  theme: SAMPLE_RESUME_THEME,
  isPublic: false,
  viewCount: 0,
  revision: 4,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const state = () => useEditorStore.getState();

describe('editor store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    state().load(resume);
  });
  afterEach(() => vi.useRealTimers());

  it('loads a resume with a clean history', () => {
    expect(state().doc?.title).toBe('Frontend roles');
    expect(state().revision).toBe(4);
    expect(selectCanUndo(state())).toBe(false);
    expect(selectIsDirty(state())).toBe(false);
  });

  it('records changes and supports undo/redo', () => {
    editorActions.setTitle('Backend roles');
    expect(selectIsDirty(state())).toBe(true);
    state().undo();
    expect(state().doc?.title).toBe('Frontend roles');
    expect(selectCanRedo(state())).toBe(true);
    state().redo();
    expect(state().doc?.title).toBe('Backend roles');
  });

  it('merges rapid edits of the same field into one undo step', () => {
    editorActions.setTitle('B');
    vi.advanceTimersByTime(100);
    editorActions.setTitle('Ba');
    vi.advanceTimersByTime(100);
    editorActions.setTitle('Bac');
    expect(state().past).toHaveLength(1);
    vi.advanceTimersByTime(COALESCE_MS + 1);
    editorActions.setTitle('Back');
    expect(state().past).toHaveLength(2);
    state().undo();
    expect(state().doc?.title).toBe('Bac');
    state().undo();
    expect(state().doc?.title).toBe('Frontend roles');
  });

  it('does not merge edits to different fields', () => {
    editorActions.setTitle('X');
    editorActions.updateTheme({ accentColor: '#000000' });
    expect(state().past).toHaveLength(2);
  });

  it('a new edit clears the redo stack', () => {
    editorActions.setTitle('One');
    state().undo();
    editorActions.updateTheme({ template: 'minimal' });
    expect(selectCanRedo(state())).toBe(false);
  });

  it('bumps the form key on undo so forms remount with restored values', () => {
    const before = state().formKey;
    editorActions.setTitle('Changed');
    expect(state().formKey).toBe(before);
    state().undo();
    expect(state().formKey).toBe(before + 1);
  });

  it('caps history length', () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i += 1) editorActions.toggleSection('section-summary');
    expect(state().past).toHaveLength(HISTORY_LIMIT);
  });

  it('adds, edits, hides, reorders and deletes items without touching store-owned fields', () => {
    const id = editorActions.addItem('section-skills', 'skills');
    const skills = () => state().doc!.content.sections.find((s) => s.id === 'section-skills');
    const item = () =>
      (skills() as { items: Array<{ id: string; name: string; visible: boolean }> }).items.find(
        (i) => i.id === id,
      )!;

    editorActions.toggleItem('section-skills', id);
    expect(item().visible).toBe(false);
    editorActions.updateItem(
      'section-skills',
      id,
      { id: 'ignored', visible: true, name: 'Cloud', level: '', keywords: ['AWS'] },
      'name',
    );
    expect(item()).toMatchObject({ id, name: 'Cloud', visible: false });

    editorActions.moveItem('section-skills', 3, 0);
    expect((skills() as { items: Array<{ id: string }> }).items[0]!.id).toBe(id);
    editorActions.deleteItem('section-skills', id);
    expect((skills() as { items: unknown[] }).items).toHaveLength(3);
  });

  it('reorders sections', () => {
    const first = state().doc!.content.sections[0]!.id;
    editorActions.moveSection(0, 2);
    expect(state().doc!.content.sections[2]!.id).toBe(first);
  });

  it('tracks saved state against the change counter', () => {
    editorActions.setTitle('Saved title');
    state().markSaved(state().changeId, 5);
    expect(selectIsDirty(state())).toBe(false);
    expect(state().revision).toBe(5);
  });
});

describe('moveInArray', () => {
  it('moves elements and ignores out-of-range indexes', () => {
    const list = ['a', 'b', 'c', 'd'];
    moveInArray(list, 0, 2);
    expect(list).toEqual(['b', 'c', 'a', 'd']);
    moveInArray(list, 1, 9);
    expect(list).toEqual(['b', 'c', 'a', 'd']);
  });
});
