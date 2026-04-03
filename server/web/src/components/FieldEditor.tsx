import { useState } from 'react';
import type { Field } from '../types';

const FIELD_TYPES = ['text', 'password', 'url', 'email', 'notes', 'username'];

interface FieldEditorProps {
  fields: Field[];
  onChange: (fields: Field[]) => void;
}

export function FieldEditor({ fields, onChange }: FieldEditorProps) {
  const updateField = (index: number, updates: Partial<Field>) => {
    const next = fields.map((f, i) => (i === index ? { ...f, ...updates } : f));
    onChange(next);
  };

  const addField = () => {
    onChange([...fields, { name: '', value: '', fieldType: 'text', protected: false }]);
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      {fields.map((field, index) => (
        <FieldRow
          key={index}
          field={field}
          onUpdate={(updates) => updateField(index, updates)}
          onRemove={() => removeField(index)}
        />
      ))}
      <button
        type="button"
        onClick={addField}
        className="flex items-center gap-1 text-sm text-[var(--md-primary)] hover:underline mt-1"
      >
        <span className="material-symbols-outlined text-base">add</span>
        Add Field
      </button>
    </div>
  );
}

function FieldRow({
  field,
  onUpdate,
  onRemove,
}: {
  field: Field;
  onUpdate: (updates: Partial<Field>) => void;
  onRemove: () => void;
}) {
  const [showValue, setShowValue] = useState(false);
  const isPassword = field.fieldType === 'password';

  return (
    <div className="flex items-start gap-2">
      <input
        type="text"
        placeholder="Name"
        value={field.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        className="w-28 px-2 py-1.5 text-sm border border-[var(--md-outline-variant)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
      />
      <div className="relative flex-1">
        <input
          type={isPassword && !showValue ? 'password' : 'text'}
          placeholder="Value"
          value={field.value}
          onChange={(e) => onUpdate({ value: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-[var(--md-outline-variant)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowValue(!showValue)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--md-on-surface-variant)] hover:text-[var(--md-on-surface)]"
          >
            <span className="material-symbols-outlined text-base">
              {showValue ? 'visibility_off' : 'visibility'}
            </span>
          </button>
        )}
      </div>
      <select
        value={field.fieldType}
        onChange={(e) => onUpdate({ fieldType: e.target.value, protected: e.target.value === 'password' })}
        className="px-2 py-1.5 text-sm border border-[var(--md-outline-variant)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--md-primary)]"
      >
        {FIELD_TYPES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={onRemove}
        className="p-1.5 text-[var(--md-error)] hover:bg-[var(--md-error-container)] rounded-lg transition-colors"
      >
        <span className="material-symbols-outlined text-base">delete</span>
      </button>
    </div>
  );
}
