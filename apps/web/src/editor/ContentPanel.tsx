import {
  SECTION_META,
  SECTION_TYPES,
  type ResumeContent,
  type SectionType,
} from '@folioforge/shared';
import { useId, useState } from 'react';
import { Button } from '../components/ui/Button';
import { inputClasses } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { editorActions } from './actions';
import { BasicsForm } from './BasicsForm';
import { SectionCard } from './SectionCard';
import { SortableList, SortableRow } from './Sortable';
import { useEditorStore } from './store';
import { focusWhenReady, useEditorUi } from './uiStore';

function AddSection({ content }: { content: ResumeContent }) {
  const selectId = useId();
  const setExpanded = useEditorUi((s) => s.setExpanded);
  const present = new Set(content.sections.map((s) => s.type));
  // Standard sections appear once; custom sections can be added any number of times.
  const available = SECTION_TYPES.filter((type) => type === 'custom' || !present.has(type));
  const [type, setType] = useState<SectionType>(available[0] ?? 'custom');
  const selected = available.includes(type) ? type : (available[0] ?? 'custom');

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-line p-3">
      <div className="min-w-40 flex-1">
        <label htmlFor={selectId} className="mb-1 block text-sm font-medium">
          Add a section
        </label>
        <select
          id={selectId}
          value={selected}
          onChange={(event) => setType(event.target.value as SectionType)}
          className={inputClasses(false)}
        >
          {available.map((t) => (
            <option key={t} value={t}>
              {SECTION_META[t].label}
            </option>
          ))}
        </select>
      </div>
      <Button
        icon={<Icon name="plus" size={16} />}
        onClick={() => {
          const id = editorActions.addSection(selected);
          setExpanded(id, true);
          focusWhenReady(`f-${id}-title`);
        }}
      >
        Add section
      </Button>
    </div>
  );
}

export function ContentPanel() {
  const content = useEditorStore((s) => s.doc!.content);
  const formKey = useEditorStore((s) => s.formKey);
  const basicsOpen = useEditorUi((s) => s.expanded.basics ?? true);
  const toggle = useEditorUi((s) => s.toggle);
  const setExpanded = useEditorUi((s) => s.setExpanded);
  const ids = content.sections.map((s) => s.id);

  return (
    <div className="space-y-3">
      <section aria-label="Personal info" className="rounded-lg border border-line bg-surface-2">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-lg p-3 text-left font-semibold hover:bg-surface"
          aria-expanded={basicsOpen}
          aria-controls="panel-basics"
          onClick={() =>
            useEditorUi.getState().expanded.basics === undefined
              ? setExpanded('basics', false)
              : toggle('basics')
          }
        >
          <Icon
            name={basicsOpen ? 'chevronDown' : 'chevronRight'}
            size={16}
            className="text-muted"
          />
          Personal info
        </button>
        {basicsOpen && (
          <div id="panel-basics" className="border-t border-line p-3">
            <BasicsForm key={formKey} basics={content.basics} />
          </div>
        )}
      </section>

      <SortableList
        ids={ids}
        getLabel={(id) =>
          `${content.sections.find((s) => s.id === id)?.title ?? 'Section'} section`
        }
        onMove={editorActions.moveSection}
      >
        <ul className="space-y-3" aria-label="Resume sections">
          {content.sections.map((section) => (
            <SortableRow key={section.id} id={section.id}>
              {(handle) => <SectionCard section={section} handle={handle} />}
            </SortableRow>
          ))}
        </ul>
      </SortableList>

      <AddSection content={content} />
    </div>
  );
}
