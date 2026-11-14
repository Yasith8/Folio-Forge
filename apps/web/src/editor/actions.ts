import {
  createEmptyItem,
  createSection,
  isListSection,
  type Basics,
  type ItemOf,
  type ListSection,
  type ListSectionType,
  type ResumeContent,
  type ResumeTheme,
  type Section,
  type SectionType,
} from '@folioforge/shared';
import type { Draft } from 'immer';
import { useEditorStore, type EditorDoc } from './store';

const update = (recipe: (draft: Draft<EditorDoc>) => void, group?: string) =>
  useEditorStore.getState().update(recipe, group);

function findSection(content: Draft<ResumeContent>, sectionId: string): Draft<Section> | undefined {
  return content.sections.find((s) => s.id === sectionId);
}

function findListSection(
  content: Draft<ResumeContent>,
  sectionId: string,
): Draft<ListSection> | undefined {
  const section = findSection(content, sectionId);
  return section && isListSection(section as Section) ? (section as Draft<ListSection>) : undefined;
}

export function moveInArray<T>(list: T[], from: number, to: number): void {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved as T);
}

export const editorActions = {
  setTitle: (title: string) => update((d) => void (d.title = title), 'title'),

  updateBasics: (values: Basics, field?: string) =>
    update(
      (d) => {
        d.content.basics = values;
      },
      `basics:${field ?? ''}`,
    ),

  updateTheme: (patch: Partial<ResumeTheme>) =>
    update(
      (d) => {
        Object.assign(d.theme, patch);
      },
      `theme:${Object.keys(patch).join(',')}`,
    ),

  addSection: (type: SectionType): string => {
    const section = createSection(type);
    update((d) => {
      d.content.sections.push(section);
    });
    return section.id;
  },

  deleteSection: (sectionId: string) =>
    update((d) => {
      d.content.sections = d.content.sections.filter((s) => s.id !== sectionId);
    }),

  renameSection: (sectionId: string, title: string) =>
    update((d) => {
      const section = findSection(d.content, sectionId);
      if (section) section.title = title;
    }, `section-title:${sectionId}`),

  toggleSection: (sectionId: string) =>
    update((d) => {
      const section = findSection(d.content, sectionId);
      if (section) section.visible = !section.visible;
    }),

  moveSection: (from: number, to: number) =>
    update((d) => moveInArray(d.content.sections, from, to)),

  updateSummary: (sectionId: string, html: string) =>
    update((d) => {
      const section = findSection(d.content, sectionId);
      if (section?.type === 'summary') section.content = html;
    }, `summary:${sectionId}`),

  addItem: (sectionId: string, type: ListSectionType): string => {
    const item = createEmptyItem(type);
    update((d) => {
      const section = findListSection(d.content, sectionId);
      (section?.items as unknown[] | undefined)?.push(item);
    });
    return item.id;
  },

  /** Writes form values into an item. `id` and `visible` are owned by the store, not the form. */
  updateItem: <T extends ListSectionType>(
    sectionId: string,
    itemId: string,
    values: ItemOf<T>,
    field?: string,
  ) =>
    update(
      (d) => {
        const section = findListSection(d.content, sectionId);
        const item = (section?.items as Array<{ id: string }> | undefined)?.find(
          (i) => i.id === itemId,
        );
        if (!item) return;
        const {
          id: _id,
          visible: _visible,
          ...rest
        } = values as ItemOf<T> & { id: string; visible: boolean };
        Object.assign(item, rest);
      },
      `item:${itemId}:${field ?? ''}`,
    ),

  toggleItem: (sectionId: string, itemId: string) =>
    update((d) => {
      const section = findListSection(d.content, sectionId);
      const item = (section?.items as Array<{ id: string; visible: boolean }> | undefined)?.find(
        (i) => i.id === itemId,
      );
      if (item) item.visible = !item.visible;
    }),

  deleteItem: (sectionId: string, itemId: string) =>
    update((d) => {
      const section = findListSection(d.content, sectionId);
      if (section)
        (section as { items: Array<{ id: string }> }).items = section.items.filter(
          (i) => i.id !== itemId,
        );
    }),

  moveItem: (sectionId: string, from: number, to: number) =>
    update((d) => {
      const section = findListSection(d.content, sectionId);
      if (section) moveInArray(section.items as unknown[], from, to);
    }),
};
