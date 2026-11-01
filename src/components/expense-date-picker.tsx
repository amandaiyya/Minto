"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

type ExpenseDatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function toISODate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromISODate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addMonths(date: Date, count: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + count, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export default function ExpenseDatePicker({ value, onChange, disabled = false }: ExpenseDatePickerProps) {
  const selectedDate = fromISODate(value);
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(selectedDate);
  const [focusedDate, setFocusedDate] = useState(selectedDate);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dayRefs = useRef(new Map<string, HTMLButtonElement>());

  const days = useMemo(() => {
    const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const start = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + index);
      return { date: day, iso: toISODate(day), inMonth: day.getMonth() === viewDate.getMonth() };
    });
  }, [viewDate]);

  useEffect(() => {
    if (open) dayRefs.current.get(toISODate(focusedDate))?.focus();
  }, [focusedDate, open, viewDate]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutside);
    return () => document.removeEventListener("pointerdown", closeOnOutside);
  }, [open]);

  const visibleDate = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(selectedDate);
  const monthLabel = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(viewDate);

  function showMonth(date: Date) {
    setViewDate(date);
    setFocusedDate(date);
  }

  function chooseDate(date: Date) {
    onChange(toISODate(date));
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleDayKey(event: KeyboardEvent<HTMLButtonElement>, date: Date) {
    let next: Date | null = null;
    if (event.key === "ArrowLeft") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 1);
    if (event.key === "ArrowRight") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
    if (event.key === "ArrowUp") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - 7);
    if (event.key === "ArrowDown") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 7);
    if (event.key === "Home") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    if (event.key === "End") next = new Date(date.getFullYear(), date.getMonth(), date.getDate() + (6 - date.getDay()));
    if (event.key === "PageUp") next = addMonths(date, event.shiftKey ? -12 : -1);
    if (event.key === "PageDown") next = addMonths(date, event.shiftKey ? 12 : 1);
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); chooseDate(date); return; }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); return; }
    if (next) {
      event.preventDefault();
      setFocusedDate(next);
      if (next.getMonth() !== viewDate.getMonth() || next.getFullYear() !== viewDate.getFullYear()) {
        setViewDate(new Date(next.getFullYear(), next.getMonth(), 1));
      }
    }
  }

  return (
    <div className="custom-picker date-picker" ref={rootRef}>
      <button
        className="text-input picker-trigger date-trigger"
        id="expense-date"
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="expense-date-calendar"
        onClick={() => {
          if (open) setOpen(false);
          else { setViewDate(selectedDate); setFocusedDate(selectedDate); setOpen(true); }
        }}
      >
        <span>{visibleDate}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true"><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M6.5 3v4M13.5 3v4M3 9h14" /></svg>
      </button>
      {open && (
        <div
          className="calendar-popover"
          id="expense-date-calendar"
          role="dialog"
          aria-label="Choose expense date"
          onKeyDown={(event) => {
            if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setOpen(false); triggerRef.current?.focus(); }
          }}
        >
          <div className="calendar-heading">
            <button className="calendar-nav" type="button" aria-label="Previous month" disabled={disabled} onClick={() => showMonth(addMonths(viewDate, -1))}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m12 4-6 6 6 6" /></svg>
            </button>
            <span aria-live="polite">{monthLabel}</span>
            <button className="calendar-nav" type="button" aria-label="Next month" disabled={disabled} onClick={() => showMonth(addMonths(viewDate, 1))}>
              <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m8 4 6 6-6 6" /></svg>
            </button>
          </div>
          <div className="calendar-grid" role="grid" aria-label={monthLabel}>
            <div className="calendar-week" role="row">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => <span role="columnheader" key={day}>{day}</span>)}
            </div>
            {Array.from({ length: 6 }, (_, week) => (
              <div className="calendar-week" role="row" key={week}>
                {days.slice(week * 7, week * 7 + 7).map(({ date, iso, inMonth }) => (
                  <button
                    className={`calendar-day ${inMonth ? "" : "outside-month"} ${iso === value ? "selected-day" : ""}`}
                    key={iso}
                    ref={(element) => { if (element) dayRefs.current.set(iso, element); else dayRefs.current.delete(iso); }}
                    type="button"
                    disabled={disabled}
                    role="gridcell"
                    aria-label={new Intl.DateTimeFormat("en-IN", { dateStyle: "full" }).format(date)}
                    aria-selected={iso === value}
                    tabIndex={iso === toISODate(focusedDate) ? 0 : -1}
                    onClick={() => chooseDate(date)}
                    onKeyDown={(event) => handleDayKey(event, date)}
                  >{date.getDate()}</button>
                ))}
              </div>
            ))}
          </div>
          <div className="calendar-footer">
            <button className="calendar-text-button" type="button" disabled={disabled} onClick={() => chooseDate(new Date())}>Today</button>
            <span className="px-2">{visibleDate}</span>
          </div>
        </div>
      )}
    </div>
  );
}
