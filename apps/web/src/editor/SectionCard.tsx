import {
  describeItem,
  isListSection,
  SECTION_META,
  type ListSection,
  type ListSectionType,
  type Section,
  type SectionItem,
} from '@folioforge/shared';
import { useState } from 'react';
import { Button, IconButton } from '../components/ui/Button';
import { ConfirmDialog } from '../components/ui/Dialog';
import { inputClasses } from '../components/ui/Field';
import { Icon } from '../components/ui/Icon';
import { toast } from '../components/ui/Toaster';
import { editorActions } from './actions';
import { FIRST_FIELD, ItemForm } from './ItemForm';
import { RichTextEditor } from './RichTextEditor';
import { DragHandle, SortableList, SortableRow, type DragHandleProps } from './Sortable';
import { useEditorStore } from './store';
import { fieldId, focusWhenReady, useEditorUi } from './uiStore';

function VisibilityToggle({
  visible,
  name,
  onToggle,
}: {
  visible: boolean;
  name: string;
  onToggle: () => void;
}) {
  return (
    <IconButton
      label={visible ? `Hide ${name} from the resume` : `Show ${name} on the resume`}
      aria-pressed={!visible}
      onClick={onToggle}
      className={visible ? '' : 'text-spark'}
    >
      <Icon name={visible ? 'eye' : 'eyeOff'} />
    </IconButton>
  );
}

function ItemCard({
  section,
  item,
  handle,
}: {
  section: ListSection;
  item: SectionItem;
  handle: DragHandleProps;
}) {
  const expanded = useEditorUi((s) => Boolean(s.expanded[item.id]));
  const fresh = useEditorUi((s) => Boolean(s.fresh[item.id]));
  const toggle = useEditorUi((s) => s.toggle);
  const formKey = useEditorStore((s) => s.formKey);
  const label = describeItem(section.type, item);
  const panelId = `panel-${item.id}`;

  const remove = () => {
    editorActions.deleteItem(section.id, item.id);
    toast.info(`Deleted “${label}”. Press Ctrl+Z (⌘Z on Mac) to undo.`);
    focusWhenReady(`add-${section.id}`);
  };

  return (
    <div
      className={`rounded-md border bg-surface ${item.visible ? 'border-line' : 'border-dashed border-line opacity-70'}`}
    >
      <div className="flex items-center gap-1 px-1 py-1">
        <DragHandle {...handle} label={`Reorder ${label}`} />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left text-sm hover:bg-surface-2"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggle(item.id)}
        >
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={16}
            className="shrink-0 text-muted"
          />
          <span className="truncate font-medium">{label}</span>
          {!item.visible && <span className="shrink-0 text-xs text-muted">(hidden)</span>}
        </button>
        <VisibilityToggle
          visible={item.visible}
          name={label}
          onToggle={() => editorActions.toggleItem(section.id, item.id)}
        />
        <IconButton
          label={`Delete ${label}`}
          onClick={remove}
          className="text-muted hover:text-danger"
        >
          <Icon name="trash" />
        </IconButton>
      </div>
      {expanded && (
        <div id={panelId} className="border-t border-line p-3">
          <ItemForm
            key={`${item.id}-${formKey}`}
            sectionId={section.id}
            type={section.type}
            item={item as never}
            fresh={fresh}
          />
        </div>
      )}
    </div>
  );
}

function ItemList({ section }: { section: ListSection }) {
  const setExpanded = useEditorUi((s) => s.setExpanded);
  const markFresh = useEditorUi((s) => s.markFresh);
  const items = section.items as SectionItem[];
  const itemLabel = SECTION_META[section.type].itemLabel;

  const add = () => {
    const id = editorActions.addItem(section.id, section.type as ListSectionType);
    markFresh(id);
    setExpanded(id, true);
    focusWhenReady(fieldId(id, FIRST_FIELD[section.type]));
  };

  return (
    <div>
      {items.length === 0 && <p className="mb-2 text-sm text-muted">Nothing here yet.</p>}
      <SortableList
        ids={items.map((i) => i.id)}
        getLabel={(id) =>
          describeItem(
            section.type,
            items.find((i) => i.id === id)!,
          )
        }
        onMove={(from, to) => editorActions.moveItem(section.id, from, to)}
      >
        <ul className="space-y-2" aria-label={`${section.title} entries`}>
          {items.map((item) => (
            <SortableRow key={item.id} id={item.id}>
              {(handle) => <ItemCard section={section} item={item} handle={handle} />}
            </SortableRow>
          ))}
        </ul>
      </SortableList>
      <Button
        id={`add-${section.id}`}
        size="sm"
        className="mt-3"
        icon={<Icon name="plus" size={16} />}
        onClick={add}
      >
        Add {itemLabel}
      </Button>
    </div>
  );
}

function SummaryEditor({ section }: { section: Extract<Section, { type: 'summary' }> }) {
  const formKey = useEditorStore((s) => s.formKey);
  return (
    <RichTextEditor
      key={formKey}
      id={fieldId(section.id, 'content')}
      label="Summary text"
      hint="Two or three sentences: who you are, what you are best at, what you want next."
      value={section.content}
      onChange={(html) => editorActions.updateSummary(section.id, html)}
    />
  );
}

export function SectionCard({ section, handle }: { section: Section; handle: DragHandleProps }) {
  const expanded = useEditorUi((s) => Boolean(s.expanded[section.id]));
  const toggle = useEditorUi((s) => s.toggle);
  const [confirming, setConfirming] = useState(false);
  const panelId = `panel-${section.id}`;
  const titleId = fieldId(section.id, 'title');
  const name = section.title || SECTION_META[section.type].label;
  const itemCount = isListSection(section) ? section.items.length : 0;

  const remove = () => {
    setConfirming(false);
    editorActions.deleteSection(section.id);
    toast.info(`Deleted the “${name}” section. Press Ctrl+Z (⌘Z on Mac) to undo.`);
  };

  return (
    <section
      aria-label={name}
      className={`rounded-lg border bg-surface-2 ${section.visible ? 'border-line' : 'border-dashed border-line'}`}
    >
      <div className="flex items-center gap-1 p-1.5">
        <DragHandle {...handle} label={`Reorder ${name} section`} />
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-1.5 text-left hover:bg-surface"
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={() => toggle(section.id)}
        >
          <Icon
            name={expanded ? 'chevronDown' : 'chevronRight'}
            size={16}
            className="shrink-0 text-muted"
          />
          <span className="truncate font-semibold">{name}</span>
          {isListSection(section) && (
            <span className="shrink-0 text-xs text-muted">{itemCount}</span>
          )}
          {!section.visible && <span className="shrink-0 text-xs text-spark">hidden</span>}
        </button>
        <VisibilityToggle
          visible={section.visible}
          name={`the ${name} section`}
          onToggle={() => editorActions.toggleSection(section.id)}
        />
        <IconButton
          label={`Delete ${name} section`}
          onClick={() => (itemCount > 0 ? setConfirming(true) : remove())}
          className="text-muted hover:text-danger"
        >
          <Icon name="trash" />
        </IconButton>
      </div>
      {expanded && (
        <div id={panelId} className="space-y-4 border-t border-line p-3">
          <div>
            <label htmlFor={titleId} className="mb-1 block text-sm font-medium">
              Section title
            </label>
            <input
              id={titleId}
              value={section.title}
              maxLength={60}
              onChange={(event) => editorActions.renameSection(section.id, event.target.value)}
              aria-invalid={section.title.trim() ? undefined : true}
              aria-describedby={section.title.trim() ? undefined : `${titleId}-error`}
              className={inputClasses(!section.title.trim())}
            />
            {!section.title.trim() && (
              <p
                id={`${titleId}-error`}
                role="alert"
                className="mt-1 text-xs font-medium text-danger"
              >
                Give this section a title
              </p>
            )}
          </div>
          {section.type === 'summary' ? (
            <SummaryEditor section={section} />
          ) : (
            <ItemList section={section} />
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirming}
        title={`Delete the “${name}” section?`}
        description={`It contains ${itemCount} ${itemCount === 1 ? 'entry' : 'entries'}. You can undo this with Ctrl+Z (⌘Z on Mac).`}
        confirmLabel="Delete section"
        destructive
        onCancel={() => setConfirming(false)}
        onConfirm={remove}
      />
    </section>
  );
}
