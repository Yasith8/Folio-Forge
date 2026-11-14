import {
  itemSchemas,
  type CertificationItem,
  type CustomItem,
  type EducationItem,
  type ExperienceItem,
  type ItemOf,
  type LanguageItem,
  type ListSectionType,
  type ProjectItem,
  type SkillItem,
} from '@folioforge/shared';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import type { z } from 'zod';
import { editorActions } from './actions';
import { FormCheckbox, FormDate, FormKeywords, FormRichText, FormText } from './fields';
import { useSyncedForm } from './useSyncedForm';

interface ItemFormProps<T extends ListSectionType> {
  sectionId: string;
  type: T;
  item: ItemOf<T>;
  fresh: boolean;
}

function useItemForm<T extends ListSectionType>({
  sectionId,
  type,
  item,
  fresh,
}: ItemFormProps<T>) {
  return useSyncedForm<ItemOf<T> & FieldValues>({
    schema: itemSchemas[type] as unknown as z.ZodType<ItemOf<T> & FieldValues>,
    values: item as ItemOf<T> & FieldValues,
    validateOnMount: !fresh,
    onChange: (values, field) => editorActions.updateItem<T>(sectionId, item.id, values, field),
  });
}

const grid = 'grid gap-3 sm:grid-cols-2';

function ExperienceFields({ form, owner }: { form: UseFormReturn<ExperienceItem>; owner: string }) {
  const current = form.watch('current');
  return (
    <div className={grid}>
      <FormText form={form} owner={owner} name="position" label="Job title" required />
      <FormText form={form} owner={owner} name="company" label="Company" required />
      <FormText form={form} owner={owner} name="location" label="Location" placeholder="Remote" />
      <FormText
        form={form}
        owner={owner}
        name="url"
        label="Company website"
        type="url"
        placeholder="https://"
      />
      <FormDate form={form} owner={owner} name="startDate" label="Start date" />
      <FormDate
        form={form}
        owner={owner}
        name="endDate"
        label="End date"
        disabled={current}
        hint={current ? 'Shown as “Present”' : undefined}
      />
      <FormCheckbox
        form={form}
        owner={owner}
        name="current"
        label="I currently work here"
        className="sm:col-span-2"
      />
      <FormRichText
        form={form}
        owner={owner}
        name="description"
        label="What you did"
        hint="Lead with impact: numbers, outcomes, scope."
        className="sm:col-span-2"
      />
    </div>
  );
}

function EducationFields({ form, owner }: { form: UseFormReturn<EducationItem>; owner: string }) {
  return (
    <div className={grid}>
      <FormText
        form={form}
        owner={owner}
        name="institution"
        label="School or university"
        required
        className="sm:col-span-2"
      />
      <FormText form={form} owner={owner} name="studyType" label="Degree" placeholder="B.S." />
      <FormText
        form={form}
        owner={owner}
        name="area"
        label="Field of study"
        placeholder="Computer Science"
      />
      <FormDate form={form} owner={owner} name="startDate" label="Start date" />
      <FormDate form={form} owner={owner} name="endDate" label="End date" />
      <FormText form={form} owner={owner} name="score" label="Grade" placeholder="3.8 GPA" />
      <FormRichText
        form={form}
        owner={owner}
        name="description"
        label="Details"
        hint="Honors, thesis or relevant courses."
        className="sm:col-span-2"
      />
    </div>
  );
}

function SkillFields({ form, owner }: { form: UseFormReturn<SkillItem>; owner: string }) {
  return (
    <div className={grid}>
      <FormText
        form={form}
        owner={owner}
        name="name"
        label="Skill group"
        required
        placeholder="Frontend"
      />
      <FormText form={form} owner={owner} name="level" label="Level" placeholder="Advanced" />
      <FormKeywords
        form={form}
        owner={owner}
        name="keywords"
        label="Skills"
        className="sm:col-span-2"
      />
    </div>
  );
}

function ProjectFields({ form, owner }: { form: UseFormReturn<ProjectItem>; owner: string }) {
  return (
    <div className={grid}>
      <FormText form={form} owner={owner} name="name" label="Project name" required />
      <FormText form={form} owner={owner} name="role" label="Your role" placeholder="Creator" />
      <FormText
        form={form}
        owner={owner}
        name="url"
        label="Live link"
        type="url"
        placeholder="https://"
      />
      <FormText
        form={form}
        owner={owner}
        name="repoUrl"
        label="Source code"
        type="url"
        placeholder="https://github.com/…"
      />
      <FormDate form={form} owner={owner} name="startDate" label="Start date" />
      <FormDate
        form={form}
        owner={owner}
        name="endDate"
        label="End date"
        hint="Leave empty if ongoing"
      />
      <FormKeywords
        form={form}
        owner={owner}
        name="keywords"
        label="Technologies"
        className="sm:col-span-2"
      />
      <FormRichText
        form={form}
        owner={owner}
        name="description"
        label="Description"
        className="sm:col-span-2"
      />
    </div>
  );
}

function CertificationFields({
  form,
  owner,
}: {
  form: UseFormReturn<CertificationItem>;
  owner: string;
}) {
  return (
    <div className={grid}>
      <FormText
        form={form}
        owner={owner}
        name="name"
        label="Certification"
        required
        className="sm:col-span-2"
      />
      <FormText form={form} owner={owner} name="issuer" label="Issued by" />
      <FormDate form={form} owner={owner} name="date" label="Date" />
      <FormText
        form={form}
        owner={owner}
        name="url"
        label="Credential link"
        type="url"
        placeholder="https://"
        className="sm:col-span-2"
      />
    </div>
  );
}

function LanguageFields({ form, owner }: { form: UseFormReturn<LanguageItem>; owner: string }) {
  return (
    <div className={grid}>
      <FormText form={form} owner={owner} name="language" label="Language" required />
      <FormText form={form} owner={owner} name="fluency" label="Fluency" placeholder="Native" />
    </div>
  );
}

function CustomFields({ form, owner }: { form: UseFormReturn<CustomItem>; owner: string }) {
  return (
    <div className={grid}>
      <FormText form={form} owner={owner} name="title" label="Title" required />
      <FormText form={form} owner={owner} name="subtitle" label="Subtitle" />
      <FormText form={form} owner={owner} name="date" label="Date" placeholder="2022 – 2023" />
      <FormText
        form={form}
        owner={owner}
        name="url"
        label="Link"
        type="url"
        placeholder="https://"
      />
      <FormRichText
        form={form}
        owner={owner}
        name="description"
        label="Description"
        className="sm:col-span-2"
      />
    </div>
  );
}

export function ItemForm<T extends ListSectionType>(props: ItemFormProps<T>) {
  const form = useItemForm(props);
  const owner = props.item.id;
  // The switch narrows `type`, so each branch knows which item shape the form holds.
  const typed = <X extends FieldValues>() => form as unknown as UseFormReturn<X>;
  switch (props.type) {
    case 'experience':
      return <ExperienceFields form={typed<ExperienceItem>()} owner={owner} />;
    case 'education':
      return <EducationFields form={typed<EducationItem>()} owner={owner} />;
    case 'skills':
      return <SkillFields form={typed<SkillItem>()} owner={owner} />;
    case 'projects':
      return <ProjectFields form={typed<ProjectItem>()} owner={owner} />;
    case 'certifications':
      return <CertificationFields form={typed<CertificationItem>()} owner={owner} />;
    case 'languages':
      return <LanguageFields form={typed<LanguageItem>()} owner={owner} />;
    case 'custom':
      return <CustomFields form={typed<CustomItem>()} owner={owner} />;
    default:
      return null;
  }
}

/** Field focused when a new item is added. */
export const FIRST_FIELD: Record<ListSectionType, string> = {
  experience: 'position',
  education: 'institution',
  skills: 'name',
  projects: 'name',
  certifications: 'name',
  languages: 'language',
  custom: 'title',
};
