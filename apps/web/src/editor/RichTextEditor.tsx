import { EditorContent, useEditor, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '../components/ui/Button';
import { describedBy, FieldMessages, inputClasses } from '../components/ui/Field';
import { Icon, type IconName } from '../components/ui/Icon';

interface RichTextEditorProps {
  id: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
}

/**
 * Rich text limited to what resumes need: bold, italic, links and bullet
 * lists. Tiptap's own undo history is disabled so Ctrl+Z goes to the
 * editor-wide undo stack.
 */
export function RichTextEditor({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  hint,
}: RichTextEditorProps) {
  const labelId = useId();
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkError, setLinkError] = useState<string>();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
        orderedList: false,
        strike: false,
        underline: false,
        undoRedo: false,
        link: {
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https', 'mailto'],
        },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-labelledby': labelId,
        ...(describedBy(id, hint, error)
          ? { 'aria-describedby': describedBy(id, hint, error)! }
          : {}),
        ...(error ? { 'aria-invalid': 'true' } : {}),
        class: 'ff-prose min-h-20 px-3 py-2 text-sm focus:outline-none',
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    onBlur: () => onBlur?.(),
  });

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive('bold') ?? false,
      italic: e?.isActive('italic') ?? false,
      bulletList: e?.isActive('bulletList') ?? false,
      link: e?.isActive('link') ?? false,
    }),
  });

  const openLinkForm = () => {
    setLinkUrl((editor?.getAttributes('link').href as string | undefined) ?? 'https://');
    setLinkError(undefined);
    setLinkOpen(true);
  };

  const applyLink = (event: FormEvent) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!/^(https?:\/\/[^\s.]+\.[^\s]+|mailto:[^\s@]+@[^\s@]+)$/.test(url)) {
      setLinkError('Enter a full link starting with https:// or mailto:');
      return;
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setLinkOpen(false);
  };

  const removeLink = () => {
    editor?.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkOpen(false);
  };

  const tools: Array<{
    name: IconName;
    label: string;
    shortcut?: string;
    pressed: boolean;
    run: () => void;
  }> = [
    {
      name: 'bold',
      label: 'Bold',
      shortcut: 'Ctrl+B',
      pressed: Boolean(active?.bold),
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      name: 'italic',
      label: 'Italic',
      shortcut: 'Ctrl+I',
      pressed: Boolean(active?.italic),
      run: () => editor?.chain().focus().toggleItalic().run(),
    },
    {
      name: 'list',
      label: 'Bullet list',
      pressed: Boolean(active?.bulletList),
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      name: 'link',
      label: active?.link ? 'Edit link' : 'Add link',
      pressed: Boolean(active?.link),
      run: openLinkForm,
    },
  ];

  return (
    <div>
      <span id={labelId} className="mb-1 block text-sm font-medium text-ink">
        {label}
      </span>
      <div className={`${inputClasses(Boolean(error), '!p-0')} focus-within:border-accent`}>
        <div
          role="toolbar"
          aria-label={`${label} formatting`}
          className="flex gap-0.5 border-b border-line px-1 py-1"
        >
          {tools.map((tool) => (
            <button
              key={tool.name}
              type="button"
              className={`grid size-7 place-items-center rounded text-muted hover:bg-surface-2 hover:text-ink ${tool.pressed ? 'bg-accent-soft text-accent' : ''}`}
              aria-pressed={tool.name === 'link' ? undefined : tool.pressed}
              aria-label={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
              title={tool.shortcut ? `${tool.label} (${tool.shortcut})` : tool.label}
              onMouseDown={(event) => event.preventDefault()}
              onClick={tool.run}
            >
              <Icon name={tool.name} size={16} />
            </button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
      {linkOpen && (
        <form
          onSubmit={applyLink}
          className="mt-2 flex flex-wrap items-start gap-2 rounded-md bg-surface-2 p-2"
          noValidate
        >
          <label htmlFor={`${id}-link`} className="sr-only">
            Link address
          </label>
          <div className="min-w-48 flex-1">
            <input
              id={`${id}-link`}
              type="url"
              autoFocus
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.stopPropagation();
                  setLinkOpen(false);
                  editor?.commands.focus();
                }
              }}
              aria-invalid={linkError ? true : undefined}
              aria-describedby={linkError ? `${id}-link-error` : undefined}
              className={inputClasses(Boolean(linkError), 'h-8 py-1')}
            />
            {linkError && (
              <p id={`${id}-link-error`} role="alert" className="mt-1 text-xs text-danger">
                {linkError}
              </p>
            )}
          </div>
          <Button type="submit" size="sm" variant="primary">
            Apply
          </Button>
          {active?.link && (
            <Button size="sm" onClick={removeLink}>
              Remove link
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setLinkOpen(false)}>
            Cancel
          </Button>
        </form>
      )}
      <FieldMessages id={id} hint={hint} error={error} />
    </div>
  );
}
