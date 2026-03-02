"use client";

import { ChefHat } from "lucide-react";

interface CustomerHeaderProps {
  restaurantName: string;
}

export function CustomerHeader({ restaurantName }: CustomerHeaderProps) {
  return (
    <header className="bg-background sticky top-0 z-40 border-b">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-center gap-2 px-4">
        <ChefHat className="text-primary h-6 w-6" />
        <span className="text-lg font-semibold tracking-tight">
          {restaurantName}
        </span>
      </div>
    </header>
  );
}
