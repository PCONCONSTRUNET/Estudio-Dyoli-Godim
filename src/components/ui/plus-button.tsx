import React from "react";

interface PlusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: number;
}

/**
 * Botão circular animado com ícone de "+".
 * Gira 90° no hover. Usado onde antes havia ícones Plus/PlusCircle.
 */
const PlusButton = ({ size = 28, title = "Adicionar", className = "", ...props }: PlusButtonProps) => {
  return (
    <button
      title={title}
      type="button"
      className={`group cursor-pointer outline-none hover:rotate-90 duration-300 inline-flex items-center justify-center ${className}`}
      {...props}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={`${size}px`}
        height={`${size}px`}
        viewBox="0 0 24 24"
        className="stroke-pink-400 fill-none group-hover:fill-pink-800 group-active:stroke-pink-200 group-active:fill-pink-600 group-active:duration-0 duration-300"
      >
        <path d="M12 22C17.5 22 22 17.5 22 12C22 6.5 17.5 2 12 2C6.5 2 2 6.5 2 12C2 17.5 6.5 22 12 22Z" strokeWidth="1.5" />
        <path d="M8 12H16" strokeWidth="1.5" />
        <path d="M12 16V8" strokeWidth="1.5" />
      </svg>
    </button>
  );
};

export default PlusButton;
