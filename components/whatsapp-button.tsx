'use client';

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";

interface WhatsAppButtonProps extends ButtonProps {
  variant?: "default" | "outline";
}

export const WhatsAppButton = ({ 
  children, 
  className, 
  variant = "default",
  ...props 
}: WhatsAppButtonProps) => {
  const redirectToWhatsApp = () => {
    window.open("https://wa.me/916385685487?text=Hi%2C%20What%20can%20you%20do%3F", "_blank");
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={redirectToWhatsApp}
      {...props}
    >
      {children}
    </Button>
  );
};
