"use client";

import * as React from "react";
import { useIsMobile } from "@/lib/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";

interface ResponsiveModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModal({
  open,
  onOpenChange,
  children,
  className,
}: ResponsiveModalProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className={className} aria-describedby={undefined}>{children}</DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={className} aria-describedby={undefined}>
        {children}
      </DialogContent>
    </Dialog>
  );
}

interface ResponsiveModalHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModalHeader({
  children,
  className,
}: ResponsiveModalHeaderProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerHeader className={className}>{children}</DrawerHeader>;
  }

  return <DialogHeader className={className}>{children}</DialogHeader>;
}

interface ResponsiveModalTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModalTitle({
  children,
  className,
}: ResponsiveModalTitleProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerTitle className={className}>{children}</DrawerTitle>;
  }

  return <DialogTitle className={className}>{children}</DialogTitle>;
}

interface ResponsiveModalDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModalDescription({
  children,
  className,
}: ResponsiveModalDescriptionProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <DrawerDescription className={className}>{children}</DrawerDescription>
    );
  }

  return <DialogDescription className={className}>{children}</DialogDescription>;
}

interface ResponsiveModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModalFooter({
  children,
  className,
}: ResponsiveModalFooterProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <DrawerFooter className={className}>{children}</DrawerFooter>;
  }

  return <DialogFooter className={className}>{children}</DialogFooter>;
}

interface ResponsiveModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ResponsiveModalBody({
  children,
  className,
}: ResponsiveModalBodyProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className={`overflow-y-auto max-h-[60vh] ${className ?? ""}`}>
        {children}
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}
