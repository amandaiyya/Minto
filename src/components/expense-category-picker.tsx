"use client";

import { useEffect, useRef, useState } from "react";
import { expenseCategories, type ExpenseCategory } from "@/lib/expenses";

type ExpenseCategoryPickerProps = {
  value: ExpenseCategory;
  onChange: (value: ExpenseCategory) => void;
  disabled?: boolean;
};

export default function ExpenseCategoryPicker({ value, onChange, disabled = false }: ExpenseCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(expenseCategories.indexOf(value));
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [activeIndex, open]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  function openMenu() {
    setActiveIndex(expenseCategories.indexOf(value));
    setOpen(true);
  }

  function moveFocus(index: number) {
    const next = (index + expenseCategories.length) % expenseCategories.length;
    setActiveIndex(next);
  }

  return (
    <div
      className="custom-picker category-picker"
      ref={rootRef}
      onBlur={(event) => {
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        className="text-input picker-trigger"
        id="expense-category"
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls="expense-category-options"
        onClick={() => open ? setOpen(false) : openMenu()}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openMenu();
          } else if (event.key === "Escape" && open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
      >
        <span>{value}</span>
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3.5 6 4.5 4 4.5-4" /></svg>
      </button>
      {open && (
        <div className="picker-menu category-menu" id="expense-category-options" role="listbox" aria-labelledby="expense-category" aria-label="Expense category">
          {expenseCategories.map((item, index) => (
            <button
              className="picker-option"
              key={item}
              ref={(element) => { optionRefs.current[index] = element; }}
              type="button"
              disabled={disabled}
              role="option"
              aria-selected={item === value}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => { onChange(item); setOpen(false); triggerRef.current?.focus(); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); moveFocus(activeIndex + 1); }
                else if (event.key === "ArrowUp") { event.preventDefault(); moveFocus(activeIndex - 1); }
                else if (event.key === "Home") { event.preventDefault(); moveFocus(0); }
                else if (event.key === "End") { event.preventDefault(); moveFocus(expenseCategories.length - 1); }
                else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onChange(item); setOpen(false); triggerRef.current?.focus(); }
                else if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
              }}
            >
              <span className="option-check" aria-hidden="true">{item === value ? "✓" : ""}</span>
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
