import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from '../components/ui/Icon';

interface SortableListProps {
  ids: string[];
  /** Human-readable name of an entry, used in screen reader announcements. */
  getLabel: (id: string) => string;
  onMove: (from: number, to: number) => void;
  children: ReactNode;
}

/**
 * Vertical drag-and-drop list (dnd-kit). Works with a mouse, touch and the
 * keyboard: focus a drag handle, press Space to pick up, arrow keys to move,
 * Space to drop and Escape to cancel. Every step is announced.
 */
export function SortableList({ ids, getLabel, onMove, children }: SortableListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const position = (id: UniqueIdentifier) => ids.indexOf(String(id)) + 1;
  const announcements: Announcements = {
    onDragStart: ({ active }) =>
      `Picked up ${getLabel(String(active.id))}. Position ${position(active.id)} of ${ids.length}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `${getLabel(String(active.id))} moved to position ${position(over.id)} of ${ids.length}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${getLabel(String(active.id))} at position ${position(over.id)} of ${ids.length}.`
        : `Dropped ${getLabel(String(active.id))}.`,
    onDragCancel: ({ active }) =>
      `Moving cancelled. ${getLabel(String(active.id))} returned to position ${position(active.id)}.`,
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    onMove(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: {
          draggable:
            'To reorder, press Space or Enter to pick up. Use the up and down arrow keys to move, Space or Enter to drop, or Escape to cancel.',
        },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

export type DragHandleProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Renders one sortable row; `children` receives the props for its drag handle button. */
export function SortableRow({
  id,
  children,
  className = '',
}: {
  id: string;
  children: (handle: DragHandleProps, dragging: boolean) => ReactNode;
  className?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${className} ${isDragging ? 'relative z-10 opacity-80 shadow-lg' : ''}`}
    >
      {children(
        { ...attributes, ...listeners, ref: setActivatorNodeRef } as DragHandleProps,
        isDragging,
      )}
    </li>
  );
}

export function DragHandle({ label, ...props }: DragHandleProps & { label: string }) {
  return (
    <button
      type="button"
      {...props}
      aria-label={label}
      title="Drag to reorder"
      className="grid size-8 shrink-0 cursor-grab touch-none place-items-center rounded text-muted hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
    >
      <Icon name="grip" />
    </button>
  );
}
