"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";

const categories = ["All", "Housing", "Food", "Transport", "Team", "Savings"];

export function CategorySelector() {
  const [selected, setSelected] = useState("All");

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((category) => {
        const active = category === selected;
        return (
          <button key={category} onClick={() => setSelected(category)}>
            <Badge
              variant={active ? "default" : "secondary"}
              className={active ? "bg-brand-gradient text-white" : "hover:bg-muted/70"}
            >
              {category}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}
