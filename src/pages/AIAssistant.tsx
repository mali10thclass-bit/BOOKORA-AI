import { Bot } from "lucide-react";
import { useI18n } from "@/context/I18nContext";
import { BusinessAssistant } from "@/components/BusinessAssistant";
import { PlanGate } from "@/components/PlanGate";

export function AIAssistant() {
  const { t } = useI18n();

  return (
    <PlanGate minimumPlan="pro" featureName="AI Assistant">
      <div className="space-y-4 max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary-600 flex items-center justify-center text-white">
            <Bot size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t("ai_assistant")}</h1>
            <p className="text-xs text-gray-500">Powered by your real business data</p>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 flex flex-col">
            <BusinessAssistant />
          </div>
        </div>
      </div>
    </PlanGate>
  );
}
