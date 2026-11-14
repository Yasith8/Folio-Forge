import {
  ACCENT_PRESETS,
  DENSITIES,
  DENSITY_IDS,
  FONT_PAIRINGS,
  FONT_PAIRING_IDS,
  PAGE_SIZE_IDS,
  PAGE_SIZES,
  TEMPLATE_IDS,
  TEMPLATES,
  type ResumeTheme,
  type TemplateId,
} from '@folioforge/shared';
import { useId, useState, type ReactNode } from 'react';
import { CheckboxField, inputClasses } from '../components/ui/Field';
import { editorActions } from './actions';
import { useEditorStore } from './store';

/** Tiny schematic of each template's layout, drawn with divs. */
function TemplateSketch({ template }: { template: TemplateId }) {
  const line = (w: string, extra = '') => (
    <div className={`h-1 rounded-full bg-current opacity-40 ${extra}`} style={{ width: w }} />
  );
  if (template === 'modern') {
    return (
      <div className="flex h-full gap-1.5 p-2">
        <div className="flex flex-1 flex-col gap-1">
          {line('70%', 'opacity-80')}
          {line('90%')}
          {line('80%')}
          {line('85%')}
          {line('60%')}
        </div>
        <div className="flex w-1/3 flex-col gap-1 border-l border-current/30 pl-1.5">
          {line('80%')}
          {line('60%')}
          {line('70%')}
        </div>
      </div>
    );
  }
  if (template === 'minimal') {
    return (
      <div className="flex h-full flex-col gap-1.5 p-2">
        {line('55%', 'opacity-80')}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-1.5">
            <div className="w-1/4">{line('100%', 'opacity-25')}</div>
            <div className="flex flex-1 flex-col gap-1">
              {line('90%')}
              {line('70%')}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center gap-1 p-2">
      {line('60%', 'opacity-80')}
      {line('40%')}
      <div className="my-0.5 h-px w-full bg-current opacity-50" />
      {line('95%')}
      {line('85%')}
      {line('90%')}
    </div>
  );
}

function OptionGroup({
  legend,
  children,
  hint,
}: {
  legend: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold">{legend}</legend>
      {hint && <p className="-mt-1 mb-2 text-xs text-muted">{hint}</p>}
      {children}
    </fieldset>
  );
}

function RadioChip<T extends string>({
  name,
  value,
  current,
  label,
  onSelect,
}: {
  name: string;
  value: T;
  current: T;
  label: string;
  onSelect: (v: T) => void;
}) {
  return (
    <label className="relative cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        checked={current === value}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span className="block rounded-md border border-line bg-surface px-3 py-1.5 text-sm peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:font-medium peer-checked:text-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
        {label}
      </span>
    </label>
  );
}

export function DesignPanel() {
  const theme = useEditorStore((s) => s.doc!.theme);
  const set = (patch: Partial<ResumeTheme>) => editorActions.updateTheme(patch);
  const fontId = useId();
  const colorId = useId();
  const [hexDraft, setHexDraft] = useState<string | null>(null);
  const hexValue = hexDraft ?? theme.accentColor;
  const hexInvalid = !/^#[0-9a-fA-F]{6}$/.test(hexValue);

  return (
    <div className="space-y-6">
      <OptionGroup legend="Template">
        <div className="grid grid-cols-3 gap-2">
          {TEMPLATE_IDS.map((id) => (
            <label key={id} className="cursor-pointer">
              <input
                type="radio"
                name="template"
                value={id}
                checked={theme.template === id}
                onChange={() => set({ template: id })}
                className="peer sr-only"
                aria-describedby={`template-${id}-desc`}
              />
              <span className="block rounded-md border-2 border-line bg-surface p-1 peer-checked:border-accent peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent">
                <span className="block aspect-[3/4] rounded-sm bg-white text-slate-800">
                  <TemplateSketch template={id} />
                </span>
                <span className="mt-1 block text-center text-sm font-medium">
                  {TEMPLATES[id].label}
                </span>
              </span>
              <span id={`template-${id}-desc`} className="sr-only">
                {TEMPLATES[id].description}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{TEMPLATES[theme.template].description}</p>
      </OptionGroup>

      <CheckboxField
        id="ats-mode"
        label="ATS-friendly mode"
        hint="One column, Arial, black text, plain contact details and no graphics, so applicant tracking systems read every word. Overrides the template look."
        checked={theme.atsMode}
        onChange={(event) => set({ atsMode: event.target.checked })}
      />

      <OptionGroup
        legend="Accent color"
        hint={theme.atsMode ? 'ATS mode prints in black.' : undefined}
      >
        <div className="flex flex-wrap items-center gap-2">
          {ACCENT_PRESETS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input
                type="radio"
                name="accent"
                value={color}
                checked={theme.accentColor === color}
                onChange={() => {
                  setHexDraft(null);
                  set({ accentColor: color });
                }}
                className="peer sr-only"
              />
              <span
                className="block size-8 rounded-full border-2 border-surface ring-2 ring-transparent peer-checked:ring-ink peer-focus-visible:ring-accent"
                style={{ backgroundColor: color }}
              >
                <span className="sr-only">{color}</span>
              </span>
            </label>
          ))}
          <label htmlFor={colorId} className="sr-only">
            Custom accent color
          </label>
          <input
            id={colorId}
            type="color"
            value={theme.accentColor}
            onChange={(event) => {
              setHexDraft(null);
              set({ accentColor: event.target.value });
            }}
            className="h-8 w-10 cursor-pointer rounded border border-line bg-surface"
          />
          <div>
            <label htmlFor={`${colorId}-hex`} className="sr-only">
              Accent color hex code
            </label>
            <input
              id={`${colorId}-hex`}
              value={hexValue}
              onChange={(event) => {
                setHexDraft(event.target.value);
                if (/^#[0-9a-fA-F]{6}$/.test(event.target.value))
                  set({ accentColor: event.target.value.toLowerCase() });
              }}
              onBlur={() => setHexDraft(null)}
              aria-invalid={hexInvalid || undefined}
              aria-describedby={hexInvalid ? `${colorId}-hex-error` : undefined}
              className={inputClasses(hexInvalid, 'h-8 w-24 py-1 font-mono')}
              spellCheck={false}
            />
          </div>
        </div>
        {hexInvalid && (
          <p id={`${colorId}-hex-error`} role="alert" className="mt-1 text-xs text-danger">
            Use a hex color like #1f4e79
          </p>
        )}
      </OptionGroup>

      <div>
        <label htmlFor={fontId} className="mb-2 block text-sm font-semibold">
          Fonts
        </label>
        <select
          id={fontId}
          value={theme.fontPairing}
          onChange={(event) =>
            set({ fontPairing: event.target.value as ResumeTheme['fontPairing'] })
          }
          className={inputClasses(false)}
          disabled={theme.atsMode}
        >
          {FONT_PAIRING_IDS.map((id) => (
            <option key={id} value={id}>
              {FONT_PAIRINGS[id].label}
            </option>
          ))}
        </select>
        {theme.atsMode && <p className="mt-1 text-xs text-muted">ATS mode always uses Arial.</p>}
      </div>

      <OptionGroup legend="Spacing">
        <div className="flex flex-wrap gap-2">
          {DENSITY_IDS.map((id) => (
            <RadioChip
              key={id}
              name="density"
              value={id}
              current={theme.density}
              label={DENSITIES[id].label}
              onSelect={(v) => set({ density: v })}
            />
          ))}
        </div>
      </OptionGroup>

      <OptionGroup legend="Page size">
        <div className="flex flex-wrap gap-2">
          {PAGE_SIZE_IDS.map((id) => (
            <RadioChip
              key={id}
              name="pageSize"
              value={id}
              current={theme.pageSize}
              label={PAGE_SIZES[id].label}
              onSelect={(v) => set({ pageSize: v })}
            />
          ))}
        </div>
      </OptionGroup>
    </div>
  );
}
