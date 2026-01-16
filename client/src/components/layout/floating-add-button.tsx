import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFloatingButton } from "./floating-button-context";

export default function FloatingAddButton() {
  const { floatingAction, floatingLabel } = useFloatingButton();
  
  // إذا لم يتم تعيين action، لا نعرض الزر
  if (!floatingAction) {
    return null;
  }

  const handleClick = () => {
    if (floatingAction) {
      floatingAction();
    }
  };

  return (
    <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom,0px))] right-6 z-[110] pointer-events-auto">
      <Button
        onClick={handleClick}
        className="h-12 w-12 rounded-full shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-110 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 border-0 text-white"
        size="icon"
        title={floatingLabel}
        data-testid="button-floating-add"
      >
        <Plus className="h-5 w-5" />
      </Button>
    </div>
  );
}