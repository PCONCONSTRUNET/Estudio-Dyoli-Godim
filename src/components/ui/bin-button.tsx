import { forwardRef, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

interface BinButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  size?: Size;
  label?: string;
}

const sizeMap: Record<Size, { box: string; radius: string; border: string; top: string; bottom: string }> = {
  sm: { box: "w-9 h-9", radius: "rounded-lg", border: "border-2", top: "w-3", bottom: "w-2.5" },
  md: { box: "w-12 h-12", radius: "rounded-xl", border: "border-[3px]", top: "w-4", bottom: "w-3" },
  lg: { box: "w-[55px] h-[55px]", radius: "rounded-[15px]", border: "border-[3px]", top: "w-[17px]", bottom: "w-[15px]" },
};

export const BinButton = forwardRef<HTMLButtonElement, BinButtonProps>(
  ({ size = "md", className, label = "Excluir", ...props }, ref) => {
    const s = sizeMap[size];
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "bin-button group flex flex-col items-center justify-center cursor-pointer transition-all duration-300 active:scale-90",
          "bg-[rgb(255,95,95)] hover:bg-[rgb(255,0,0)]",
          s.box,
          s.radius,
          s.border,
          "border-[rgb(255,201,201)]",
          className
        )}
        {...props}
      >
        <svg
          className={cn("bin-top transition-transform duration-300 origin-right group-hover:rotate-45", s.top)}
          viewBox="0 0 39 7"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <line y1={5} x2={39} y2={5} stroke="white" strokeWidth={4} />
          <line x1={12} y1="1.5" x2="26.0357" y2="1.5" stroke="white" strokeWidth={3} />
        </svg>
        <svg className={cn("bin-bottom", s.bottom)} viewBox="0 0 33 39" fill="none" xmlns="http://www.w3.org/2000/svg">
          <mask id="bin-mask-inside" fill="white">
            <path d="M0 0H33V35C33 37.2091 31.2091 39 29 39H4C1.79086 39 0 37.2091 0 35V0Z" />
          </mask>
          <path
            d="M0 0H33H0ZM37 35C37 39.4183 33.4183 43 29 43H4C-0.418278 43 -4 39.4183 -4 35H4H29H37ZM4 43C-0.418278 43 -4 39.4183 -4 35V0H4V35V43ZM37 0V35C37 39.4183 33.4183 43 29 43V35V0H37Z"
            fill="white"
            mask="url(#bin-mask-inside)"
          />
          <path d="M12 6L12 29" stroke="white" strokeWidth={4} />
          <path d="M21 6V29" stroke="white" strokeWidth={4} />
        </svg>
      </button>
    );
  }
);
BinButton.displayName = "BinButton";

export default BinButton;
