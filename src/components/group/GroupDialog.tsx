import { useState, useEffect } from "react"
import {
  Folder, Briefcase, Home, ShoppingCart, CreditCard, Mail,
  Cloud, Monitor, Gamepad2, GraduationCap, Heart, Star,
  Code, Shield, KeyRound, Landmark, Phone, Wifi, Car, Plane, Loader2,
} from "lucide-react"
import { Modal } from "../common/Modal"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useVaultStore } from "../../stores/vaultStore"
import { useToast } from "../common/Toast"
import { useTranslation } from "../../i18n"
import { cn } from "@/lib/utils"
import type { Group } from "../../types"
import type { LucideIcon } from "lucide-react"

interface GroupDialogProps {
  isOpen: boolean
  onClose: () => void
  group?: Group | null
}

const iconMap: Record<string, LucideIcon> = {
  folder: Folder,
  work: Briefcase,
  home: Home,
  shopping_cart: ShoppingCart,
  credit_card: CreditCard,
  mail: Mail,
  cloud: Cloud,
  devices: Monitor,
  gamepad: Gamepad2,
  school: GraduationCap,
  favorite: Heart,
  star: Star,
  code: Code,
  security: Shield,
  vpn_key: KeyRound,
  account_balance: Landmark,
  phone: Phone,
  wifi: Wifi,
  car: Car,
  flight: Plane,
}

const iconOptions = Object.keys(iconMap)

export function GroupDialog({ isOpen, onClose, group }: GroupDialogProps) {
  const { createGroup, updateGroup, deleteGroup } = useVaultStore()
  const { showToast } = useToast()
  const { t } = useTranslation()

  const [name, setName] = useState("")
  const [icon, setIcon] = useState("folder")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditMode = !!group

  useEffect(() => {
    if (group) {
      setName(group.name)
      setIcon(group.icon || "folder")
    } else {
      setName("")
      setIcon("folder")
    }
  }, [group, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (!name.trim()) {
        showToast("error", t("group.nameRequired"))
        setIsSubmitting(false)
        return
      }
      if (isEditMode && group) {
        await updateGroup(group.id, { name: name.trim(), icon })
        showToast("success", t("group.updated"))
      } else {
        await createGroup(name.trim(), icon)
        showToast("success", t("group.created"))
      }
      onClose()
    } catch (error) {
      showToast("error", String(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? t("group.editGroup") : t("group.newGroup")}
      size="sm"
      footer={
        <>
          {isEditMode && (
            <Button
              variant="destructive"
              onClick={async () => {
                if (group && confirm(t("group.deleteConfirm"))) {
                  await deleteGroup(group.id)
                  showToast("success", t("group.deleted"))
                  onClose()
                }
              }}
            >
              {t("group.delete")}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose}>
            {t("group.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !name.trim()}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isEditMode ? t("group.save") : t("group.create")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="group-name">{t("group.groupName")}</Label>
          <div className="relative">
            <Folder className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("group.groupNamePlaceholder")}
              className="pl-10"
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">
            {t("group.icon")}
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {iconOptions.map((iconName) => {
              const IconComp = iconMap[iconName] || Folder
              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => setIcon(iconName)}
                  className={cn(
                    "p-3 rounded-lg transition-all duration-150 flex items-center justify-center",
                    icon === iconName
                      ? "bg-primary/10 text-primary ring-2 ring-primary"
                      : "bg-accent text-muted-foreground hover:bg-accent/80"
                  )}
                >
                  <IconComp className="h-5 w-5" />
                </button>
              )
            })}
          </div>
        </div>
      </form>
    </Modal>
  )
}
