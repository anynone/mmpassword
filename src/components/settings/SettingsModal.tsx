import { SlidersHorizontal, Shield, Info } from "lucide-react"
import { Modal } from "../common/Modal"
import { GeneralSettings } from "./GeneralSettings"
import { SecuritySettings } from "./SecuritySettings"
import { AboutSettings } from "./AboutSettings"
import { useTranslation } from "../../i18n"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useTranslation()

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t("settings.title")} size="2xl">
      <Tabs defaultValue="general" orientation="vertical" className="flex gap-6 -m-6">
        <TabsList className="flex flex-col w-48 shrink-0 bg-muted/30 border-r h-auto rounded-none justify-start p-3 -my-6 py-6">
          <TabsTrigger
            value="general"
            className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("settings.general")}
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Shield className="h-4 w-4" />
            {t("settings.security")}
          </TabsTrigger>
          <TabsTrigger
            value="about"
            className="w-full justify-start gap-3 px-3 py-2.5 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Info className="h-4 w-4" />
            {t("settings.about")}
          </TabsTrigger>
        </TabsList>
        <div className="flex-1 min-w-0 py-1 pr-2">
          <TabsContent value="general" className="mt-0">
            <GeneralSettings />
          </TabsContent>
          <TabsContent value="security" className="mt-0">
            <SecuritySettings />
          </TabsContent>
          <TabsContent value="about" className="mt-0">
            <AboutSettings />
          </TabsContent>
        </div>
      </Tabs>
    </Modal>
  )
}
