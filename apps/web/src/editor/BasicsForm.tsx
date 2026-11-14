import { basicsSchema, createId, type Basics } from '@folioforge/shared';
import { useRef, useState } from 'react';
import { useFieldArray } from 'react-hook-form';
import { Button, IconButton } from '../components/ui/Button';
import { Icon } from '../components/ui/Icon';
import { photoFileToDataUrl } from '../lib/image';
import { editorActions } from './actions';
import { FormText } from './fields';
import { fieldId } from './uiStore';
import { useSyncedForm } from './useSyncedForm';

const OWNER = 'basics';

export function BasicsForm({ basics }: { basics: Basics }) {
  const form = useSyncedForm<Basics>({
    schema: basicsSchema,
    values: basics,
    validateOnMount: true,
    onChange: (values, field) => editorActions.updateBasics(values, field),
  });
  // keyName avoids clashing with each profile's own `id` field.
  const profiles = useFieldArray({ control: form.control, name: 'profiles', keyName: 'key' });
  const photo = form.watch('photo');
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string>();
  const photoErrorMessage = photoError ?? form.formState.errors.photo?.message;

  const onPhotoSelected = async (file: File) => {
    setPhotoError(undefined);
    try {
      form.setValue('photo', await photoFileToDataUrl(file), {
        shouldDirty: true,
        shouldValidate: true,
      });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : 'The image could not be read.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormText
          form={form}
          owner={OWNER}
          name="name"
          label="Full name"
          required
          autoComplete="name"
        />
        <FormText
          form={form}
          owner={OWNER}
          name="headline"
          label="Headline"
          placeholder="Frontend Engineer"
        />
        <FormText
          form={form}
          owner={OWNER}
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
        />
        <FormText
          form={form}
          owner={OWNER}
          name="phone"
          label="Phone"
          type="tel"
          autoComplete="tel"
        />
        <FormText
          form={form}
          owner={OWNER}
          name="location"
          label="Location"
          placeholder="City, Country"
        />
        <FormText
          form={form}
          owner={OWNER}
          name="website"
          label="Website"
          type="url"
          placeholder="https://"
        />
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">Profile photo</legend>
        <p id={`${fieldId(OWNER, 'photo')}-hint`} className="mb-2 text-xs text-muted">
          Shown on your public portfolio page only. Resumes stay photo-free, which applicant
          tracking systems prefer.
        </p>
        <div className="flex items-center gap-3">
          {photo ? (
            <img
              src={photo}
              alt="Your profile photo"
              className="size-14 rounded-full border border-line object-cover"
            />
          ) : (
            <div
              className="grid size-14 place-items-center rounded-full border border-dashed border-line text-xs text-muted"
              aria-hidden="true"
            >
              None
            </div>
          )}
          <input
            ref={photoInput}
            id={fieldId(OWNER, 'photo')}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            aria-describedby={`${fieldId(OWNER, 'photo')}-hint`}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void onPhotoSelected(file);
              event.target.value = '';
            }}
          />
          <Button
            size="sm"
            icon={<Icon name="upload" size={16} />}
            onClick={() => photoInput.current?.click()}
          >
            {photo ? 'Replace photo' : 'Upload photo'}
          </Button>
          {photo && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                form.setValue('photo', '', { shouldDirty: true, shouldValidate: true })
              }
            >
              Remove
            </Button>
          )}
        </div>
        {photoErrorMessage && (
          <p role="alert" className="mt-1 text-xs font-medium text-danger">
            {photoErrorMessage}
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Links</legend>
        {profiles.fields.length === 0 && (
          <p className="mb-2 text-sm text-muted">
            Add GitHub, LinkedIn or anywhere else people can find your work.
          </p>
        )}
        <ul className="space-y-3">
          {profiles.fields.map((profile, index) => (
            <li
              key={profile.key}
              className="grid items-end gap-2 rounded-md border border-line p-3 sm:grid-cols-[8rem_1fr_auto]"
            >
              <FormText
                form={form}
                owner={OWNER}
                name={`profiles.${index}.network`}
                label="Site"
                placeholder="GitHub"
                required
              />
              <FormText
                form={form}
                owner={OWNER}
                name={`profiles.${index}.url`}
                label="Link"
                type="url"
                placeholder="https://github.com/you"
              />
              <IconButton
                label={`Remove link ${index + 1}`}
                className="justify-self-end text-danger sm:mb-1"
                onClick={() => profiles.remove(index)}
              >
                <Icon name="trash" />
              </IconButton>
            </li>
          ))}
        </ul>
        {profiles.fields.length < 10 && (
          <Button
            size="sm"
            className="mt-3"
            icon={<Icon name="plus" size={16} />}
            onClick={() =>
              profiles.append(
                { id: createId(), network: '', username: '', url: '' },
                { shouldFocus: true },
              )
            }
          >
            Add link
          </Button>
        )}
      </fieldset>
    </div>
  );
}
