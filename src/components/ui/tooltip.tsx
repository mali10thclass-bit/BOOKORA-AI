import * as React from "react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";
import { ArrowLeftEndOnRectangleIcon } from "lucide-react";

interface TooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  className?: string;
  delayDuration?: number;
}

const Tooltip = ({
  content,
  children,
  side = "top",
  align = "center",
  className,
  delayDuration = 700,
}: TooltipProps) => {
  const [open, setOpen] = React.useState(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout>>();

  const handleEnter = () => {
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const handleLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!open) return children;

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return createPortal(
    <>
      <div
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
        className="inline-block"
      >
        {children}
      </div>
      <div
        className={cn(
          "animate-in fade-in-0 zoom-in-95 fixed z-50",
          sideClasses[side],
          className
        )}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        <div className="relative">
          <div className="rounded-lg border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg animate-in zoom-in-95">
            {content}
          </div>
          <div
            className={cn(
              "absolute h-2 w-2 rotate-45 border-r border-b border-slate-200 bg-slate-900",
              {
                "bottom-[-4px] left-1/2 -translate-x-1/2": side === "top",
                "top-[-4px] left-1/2 -translate-x-1/2": side === "bottom",
                "right-[-4px] top-1/2 -translate-y-1/2": side === "left",
                "left-[-4px] top-1/2 -translate-y-1/2": side === "right",
              }
            )}
          />
        </div>
      </div>
    </>,
    document.body
  );
};

interface TooltipProviderProps {
  children: React.ReactNode;
}
const TooltipProvider = ({ children }: TooltipProviderProps) => (
  <>{children}</>
);

export { Tooltip, TooltipProvider };
