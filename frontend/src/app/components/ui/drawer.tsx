"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { FocusScope } from "@radix-ui/react-focus-scope";
import { useScrollLock } from "@/util/useScrollLock";

import { cn } from "./utils";

const DrawerState = React.createContext({ open: false, close: () => {} });

function Drawer({
  open, defaultOpen, onOpenChange, ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen ?? false);
  const isOpen = open ?? internalOpen;
  // CartDrawer already locks the root. Defer one frame so its existing lock can take effect;
  // standalone drawers still acquire the shared lock themselves.
  const [needsLock, setNeedsLock] = React.useState(false);
  React.useEffect(() => {
    if (!isOpen) {
      setNeedsLock(false);
      return;
    }
    const frame = requestAnimationFrame(() => {
      setNeedsLock(document.documentElement.style.overflow !== "hidden");
    });
    return () => cancelAnimationFrame(frame);
  }, [isOpen]);
  useScrollLock(isOpen && needsLock);
  const changeOpen = (next: boolean) => {
    if (open === undefined) setInternalOpen(next);
    onOpenChange?.(next);
  };
  return <DrawerState.Provider value={{ open: isOpen, close: () => changeOpen(false) }}>
    <DrawerPrimitive.Root data-slot="drawer" {...props} modal={false} noBodyStyles autoFocus open={isOpen} onOpenChange={changeOpen} />
  </DrawerState.Provider>;
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { open, close } = React.useContext(DrawerState);
  return (
    <div
      data-slot="drawer-overlay"
      data-state={open ? "open" : "closed"}
      onClick={close}
      className={cn(
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
        className,
      )}
      {...props}
    />
  );
}

function DrawerContent({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  onPointerDownOutside,
  onInteractOutside,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const previousFocus = React.useRef<HTMLElement | null>(null);
  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <FocusScope asChild trapped loop>
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        aria-modal="true"
        onOpenAutoFocus={(event) => {
          previousFocus.current = document.activeElement as HTMLElement | null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          event.preventDefault();
          const target = previousFocus.current;
          requestAnimationFrame(() => { if (target?.isConnected) target.focus(); });
        }}
        onPointerDownOutside={(event) => { onPointerDownOutside?.(event); event.preventDefault(); }}
        onInteractOutside={(event) => { onInteractOutside?.(event); event.preventDefault(); }}
        className={cn(
          "group/drawer-content bg-background fixed z-50 flex h-auto flex-col",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:rounded-l-2xl data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:border-gray-200 data-[vaul-drawer-direction=right]:dark:border-gray-700 data-[vaul-drawer-direction=right]:shadow-[-8px_0_24px_rgba(0,0,0,0.12)] data-[vaul-drawer-direction=right]:dark:shadow-[-8px_0_24px_rgba(0,0,0,0.4)] data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        {...props}
      >
        <div className="bg-muted mx-auto mt-4 hidden h-2 w-[100px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
      </FocusScope>
    </DrawerPortal>
  );
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn("text-foreground font-semibold", className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
