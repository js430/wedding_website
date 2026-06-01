"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  plusOne: boolean;
  plusOneName?: string;
  dietary?: string;
  seatCount: number;
}

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
}

// ─── Guest Card (static, used in DragOverlay) ─────────────────────────────────

function GuestCardStatic({ guest }: { guest: Guest }) {
  return (
    <div className="bg-white border border-rose-soft/50 px-3 py-2 shadow-lg text-sm w-48">
      <p className="font-sans font-medium text-bark truncate">{guest.name}</p>
      {guest.plusOne && guest.plusOneName && (
        <p className="font-sans text-bark/50 text-xs truncate">+1: {guest.plusOneName}</p>
      )}
      {guest.dietary && (
        <p className="font-sans text-rose-deep text-xs truncate">{guest.dietary}</p>
      )}
    </div>
  );
}

// ─── Draggable Guest Card ─────────────────────────────────────────────────────

function DraggableGuest({ guest }: { guest: Guest }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { guest },
  });

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Translate.toString(transform) } : undefined}
      {...listeners}
      {...attributes}
      className={`bg-white border border-rose-soft/40 px-3 py-2 cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-25" : "opacity-100"
      }`}
    >
      <p className="font-sans text-sm font-medium text-bark truncate">{guest.name}</p>
      {guest.plusOne && guest.plusOneName && (
        <p className="font-sans text-bark/50 text-xs truncate">+1: {guest.plusOneName}</p>
      )}
      {guest.dietary && (
        <span className="inline-block mt-0.5 font-sans text-rose-deep text-xs">{guest.dietary}</span>
      )}
    </div>
  );
}

// ─── Unassigned Panel ─────────────────────────────────────────────────────────

function UnassignedPanel({ guests }: { guests: Guest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });
  const total = guests.reduce((s, g) => s + g.seatCount, 0);

  return (
    <div
      ref={setNodeRef}
      className={`w-56 shrink-0 flex flex-col border-r border-rose-soft/30 transition-colors ${
        isOver ? "bg-rose-soft/20" : "bg-rose-blush/40"
      }`}
    >
      <div className="px-4 pt-4 pb-3 border-b border-rose-soft/20">
        <p className="font-sans text-xs tracking-widest uppercase text-bark/50 mb-0.5">
          Unassigned
        </p>
        <p className="font-serif text-3xl text-bark leading-none">{total}</p>
        <p className="font-sans text-bark/40 text-xs mt-0.5">
          {guests.length} {guests.length === 1 ? "entry" : "entries"}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {guests.map((g) => (
          <DraggableGuest key={g.id} guest={g} />
        ))}
        {guests.length === 0 && (
          <p className="font-sans text-bark/30 text-xs text-center pt-8">
            All guests seated 🎉
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Droppable Table Card ─────────────────────────────────────────────────────

function TableCard({
  table,
  guests,
  onRemove,
  onRename,
  onCapacityChange,
}: {
  table: Table;
  guests: Guest[];
  onRemove: () => void;
  onRename: (n: string) => void;
  onCapacityChange: (n: number) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: table.id });
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(table.name);
  const seated = guests.reduce((s, g) => s + g.seatCount, 0);
  const pct = Math.min((seated / table.capacity) * 100, 100);

  return (
    <div
      ref={setNodeRef}
      className={`border p-4 min-h-40 flex flex-col transition-colors ${
        isOver ? "border-rose-deep bg-rose-blush/70" : "border-rose-soft/40 bg-white/60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-1">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => { onRename(nameInput); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") { onRename(nameInput); setEditing(false); }
                if (e.key === "Escape") { setNameInput(table.name); setEditing(false); }
              }}
              className="font-serif text-bark text-base border-b border-rose-deep bg-transparent focus:outline-none w-full"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-serif text-bark text-base hover:text-rose-deep transition-colors text-left w-full truncate"
              title="Click to rename"
            >
              {table.name}
            </button>
          )}
        </div>
        <button
          onClick={onRemove}
          className="text-bark/25 hover:text-rose-deep text-xs transition-colors shrink-0 ml-1"
          title="Remove table"
        >
          ✕
        </button>
      </div>

      {/* Capacity */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1 bg-rose-soft/20 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              seated > table.capacity ? "bg-red-400" : "bg-rose-deep"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-sans text-bark/40 text-xs shrink-0">
          {seated}/
          <input
            type="number"
            value={table.capacity}
            min={1}
            max={30}
            onChange={(e) => onCapacityChange(Number(e.target.value))}
            className="w-6 bg-transparent focus:outline-none text-bark/40 text-xs"
            title="Capacity"
          />
        </span>
      </div>

      {/* Guests */}
      <div className="flex-1 space-y-1.5">
        {guests.map((g) => (
          <DraggableGuest key={g.id} guest={g} />
        ))}
        {guests.length === 0 && (
          <p className="font-sans text-bark/25 text-xs text-center py-4">
            Drop guests here
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SeatingChart() {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({}); // guestId → tableId
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Tables from localStorage
    const stored = localStorage.getItem("seating_tables");
    if (stored) {
      setTables(JSON.parse(stored));
    } else {
      const defaults: Table[] = Array.from({ length: 10 }, (_, i) => ({
        id: `table-${i + 1}`,
        number: i + 1,
        name: `Table ${i + 1}`,
        capacity: 10,
      }));
      setTables(defaults);
      localStorage.setItem("seating_tables", JSON.stringify(defaults));
    }

    async function fetchData() {
      setLoading(true);
      try {
        const [gRes, aRes] = await Promise.all([
          fetch("/api/seating/guests"),
          fetch("/api/seating/assignments"),
        ]);
        const { guests: g } = await gRes.json();
        const { assignments: a } = await aRes.json();

        setGuests(g);

        const map: Record<string, string> = {};
        a.forEach((row: { guestId: string; tableId: string }) => {
          if (row.tableId) map[row.guestId] = row.tableId;
        });
        setAssignments(map);
      } catch (e) {
        console.error("Failed to load seating data", e);
      }
      setLoading(false);
    }

    fetchData();
  }, []);

  // Persist tables
  useEffect(() => {
    if (tables.length > 0) localStorage.setItem("seating_tables", JSON.stringify(tables));
  }, [tables]);

  // ── Save assignment ───────────────────────────────────────────────────────
  async function persist(guestId: string, tableId: string | null) {
    setSaving(true);
    const guest = guests.find((g) => g.id === guestId);
    try {
      await fetch("/api/seating/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, guestName: guest?.name ?? "", tableId }),
      });
    } catch (e) {
      console.error("Save failed", e);
    }
    setSaving(false);
  }

  // ── Drag handlers ─────────────────────────────────────────────────────────
  function onDragStart(e: DragStartEvent) {
    setActiveGuest(guests.find((g) => g.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveGuest(null);
    const { active, over } = e;
    if (!over) return;

    const guestId = active.id as string;
    const dest = over.id as string;
    const newTableId = dest === "unassigned" ? null : dest;
    const curTableId = assignments[guestId] ?? null;

    if (newTableId === curTableId) return;

    // Optimistic update
    setAssignments((prev) => {
      const next = { ...prev };
      if (newTableId === null) delete next[guestId];
      else next[guestId] = newTableId;
      return next;
    });

    persist(guestId, newTableId);
  }

  // ── Table management ──────────────────────────────────────────────────────
  function addTable() {
    const next = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    const t: Table = {
      id: `table-${Date.now()}`,
      number: next,
      name: `Table ${next}`,
      capacity: 10,
    };
    setTables((p) => [...p, t]);
  }

  function removeTable(tableId: string) {
    const affected = Object.keys(assignments).filter((gid) => assignments[gid] === tableId);
    if (affected.length > 0) {
      if (!window.confirm(`This table has ${affected.length} guest(s). Remove and unassign them?`)) return;
      const next = { ...assignments };
      affected.forEach((gid) => {
        delete next[gid];
        persist(gid, null);
      });
      setAssignments(next);
    }
    setTables((p) => p.filter((t) => t.id !== tableId));
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalSeats = guests.reduce((s, g) => s + g.seatCount, 0);
  const seatedCount = guests.reduce((s, g) => (assignments[g.id] ? s + g.seatCount : s), 0);
  const unassigned = guests.filter((g) => !assignments[g.id]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-rose-blush flex items-center justify-center">
        <p className="font-serif italic text-bark/60 animate-pulse">Loading guest list…</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="min-h-screen bg-rose-blush flex flex-col">

        {/* Top bar */}
        <div className="bg-crimson-darkest text-rose-blush px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-serif text-xl leading-none">Seating Chart</h1>
            <p className="font-sans text-rose-soft/50 text-xs mt-0.5">
              Jeffrey &amp; Katie · March 27, 2027
            </p>
          </div>
          <div className="flex items-center gap-5">
            {saving && (
              <span className="font-sans text-rose-soft/50 text-xs animate-pulse">Saving…</span>
            )}
            <span className="font-sans text-rose-blush/60 text-sm">
              {seatedCount} / {totalSeats} seated
            </span>
            <button
              onClick={addTable}
              className="border border-rose-soft/30 text-rose-blush/80 font-sans text-xs tracking-widest uppercase px-4 py-1.5 hover:bg-crimson-dark transition-colors"
            >
              + Table
            </button>
            <a
              href="/"
              className="font-sans text-rose-soft/50 text-xs hover:text-rose-blush transition-colors"
            >
              ← Site
            </a>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <UnassignedPanel guests={unassigned} />

          {/* Tables grid */}
          <div className="flex-1 overflow-auto p-5">
            {tables.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="font-sans text-bark/30 text-sm">
                  No tables yet — click <strong>+ Table</strong> to add one.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tables.map((t) => (
                  <TableCard
                    key={t.id}
                    table={t}
                    guests={guests.filter((g) => assignments[g.id] === t.id)}
                    onRemove={() => removeTable(t.id)}
                    onRename={(name) =>
                      setTables((p) => p.map((x) => (x.id === t.id ? { ...x, name } : x)))
                    }
                    onCapacityChange={(cap) =>
                      setTables((p) => p.map((x) => (x.id === t.id ? { ...x, capacity: cap } : x)))
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeGuest && <GuestCardStatic guest={activeGuest} />}
      </DragOverlay>
    </DndContext>
  );
}
