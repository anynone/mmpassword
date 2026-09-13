import { useState, useRef } from "react"
import { Plus, Trash2, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PasswordStrengthIndicator } from "../common/PasswordStrengthIndicator"
import { PasswordGeneratorPanel } from "./PasswordGeneratorPanel"
import { useVaultStore, type EntryFormData, type FieldInput } from "../../stores/vaultStore"
import { useTranslation } from "../../i18n"
import type { FieldType, EntryType } from "../../types"

const fieldTypeOptions = [
  { value: "text", labelKey: "entryForm.fieldType.text" },
  { value: "password", labelKey: "entryForm.fieldType.password" },
  { value: "email", labelKey: "entryForm.fieldType.email" },
  { value: "url", labelKey: "entryForm.fieldType.url" },
  { value: "notes", labelKey: "entryForm.fieldType.notes" },
  { value: "username", labelKey: "entryForm.fieldType.username" },
]

const entryTypeOptions = [
  { value: "websiteLogin", labelKey: "entryForm.entryType.websiteLogin" },
  { value: "secureNote", labelKey: "entryForm.entryType.secureNote" },
]

interface EntryFormFieldsProps {
  data: EntryFormData
  onChange: (data: Partial<EntryFormData>) => void
  showEntryType: boolean
  isSubmitting: boolean
}

export function EntryFormFields({ data, onChange, showEntryType, isSubmitting }: EntryFormFieldsProps) {
  const groups = useVaultStore((s) => s.groups)
  const { t } = useTranslation()
  const [generatorIndex, setGeneratorIndex] = useState<number | null>(null)
  const generatorBtnRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  const updateField = (index: number, key: keyof FieldInput, value: string) => {
    const newFields = data.fields.map((f, i) =>
      i === index ? { ...f, [key]: value } : f
    )
    onChange({ fields: newFields })
  }

  const addField = () => {
    onChange({ fields: [...data.fields, { id: crypto.randomUUID(), name: "", value: "", fieldType: "text" as FieldType }] })
  }

  const removeField = (index: number) => {
    onChange({ fields: data.fields.filter((_, i) => i !== index) })
  }

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="entry-title">{t("entryForm.title")}</Label>
          <Input
            id="entry-title"
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t("entryForm.titlePlaceholder")}
            required
            disabled={isSubmitting}
          />
        </div>

        {showEntryType && (
          <div className="space-y-2">
            <Label>{t("entryForm.entryType")}</Label>
            <Select
              value={data.entryType}
              onValueChange={(value) => onChange({ entryType: value as EntryType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {entryTypeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          <Label>{t("entryForm.group")}</Label>
          <Select
            value={data.groupId || "__none__"}
            onValueChange={(value) => onChange({ groupId: value === "__none__" ? "" : value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("entryForm.noGroup")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">{t("entryForm.noGroup")}</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="entry-favorite"
            checked={data.favorite}
            onCheckedChange={(checked) => onChange({ favorite: checked === true })}
          />
          <Label htmlFor="entry-favorite" className="cursor-pointer text-sm font-normal">
            {t("entryForm.markFavorite")}
          </Label>
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t("entryForm.fields")}
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addField}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t("entryDetail.addField")}
          </Button>
        </div>

        {data.fields.map((field, index) => (
          <div key={field.id} className="flex items-start gap-2">
            <div className="flex-1 grid grid-cols-12 gap-2">
              <div className="col-span-3">
                <Input
                  value={field.name}
                  onChange={(e) => updateField(index, "name", e.target.value)}
                  placeholder={t("entryForm.fieldNamePlaceholder")}
                />
              </div>
              <div className="col-span-2">
                <Select
                  value={field.fieldType}
                  onValueChange={(value) => updateField(index, "fieldType", value as FieldType)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-7 relative">
                <Input
                  type={field.fieldType === "password" ? "password" : "text"}
                  value={field.value}
                  onChange={(e) => updateField(index, "value", e.target.value)}
                  placeholder={t("entryDetail.fieldValuePlaceholder")}
                  className={field.fieldType === "password" ? "pr-10" : ""}
                />
                {field.fieldType === "password" && (
                  <>
                    <Button
                      ref={(el) => { generatorBtnRefs.current[index] = el }}
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setGeneratorIndex(generatorIndex === index ? null : index)}
                    >
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    {generatorIndex === index && (
                      <PasswordGeneratorPanel
                        triggerRef={{ current: generatorBtnRefs.current[index] ?? null }}
                        onApply={(pwd) => updateField(index, "value", pwd)}
                        onClose={() => setGeneratorIndex(null)}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-destructive hover:bg-destructive/10"
              onClick={() => removeField(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {data.fields.some((f) => f.fieldType === "password" && f.value) && (
          <PasswordStrengthIndicator
            password={data.fields.find((f) => f.fieldType === "password")?.value || ""}
          />
        )}
      </div>
    </div>
  )
}
