'use client';

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";

interface WhatsAppButtonProps extends ButtonProps {
  variant?: "default" | "outline";
  redirectToWhatsApp?: boolean;
}

export const WhatsAppButton = ({ 
  children, 
  className, 
  variant = "default",
  redirectToWhatsApp = true,
  onClick,
  ...props 
}: WhatsAppButtonProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onClick) {
      onClick(e);
    } else if (redirectToWhatsApp) {
      window.open("https://wa.me/916385685487?text=Hi%2C%20What%20can%20you%20do%3F", "_blank");
    }
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      {...props}
    >
      {children}
    </Button>
  );
};
