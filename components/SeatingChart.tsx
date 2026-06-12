"use client";

import { useState, useEffect } from "react";
import {
  DndContext, DragEndEvent, DragStartEvent, DragOverlay,
  useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Guest {
  id: string;
  name: string;
  plusOne: boolean;
  plusOneName?: string;
  dietary?: string;
}

interface Table {
  id: string;
  number: number;
  name: string;
  capacity: number;
}

interface SeatAssignment {
  tableId: string;
  seatNumber: number; // 1-based
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CANVAS  = 240; // px — table canvas square
const CENTER  = CANVAS / 2;
const R_SEAT  = 84;  // radius from center to seat center
const S       = 56;  // seat slot size (px)
const R_TABLE = 38;  // center circle radius

// ─── Static card (DragOverlay) ────────────────────────────────────────────────

function GuestCardStatic({ guest }: { guest: Guest }) {
  return (
    <div className="bg-white border border-rose-soft shadow-xl text-xs px-2 py-1.5 w-36 pointer-events-none rounded-sm">
      <p className="font-sans font-semibold text-bark truncate">{guest.name}</p>
      {guest.plusOne && guest.plusOneName && (
        <p className="font-sans text-bark/50 truncate">+1: {guest.plusOneName}</p>
      )}
      {guest.dietary && (
        <p className="font-sans text-rose-deep truncate">{guest.dietary}</p>
      )}
    </div>
  );
}

// ─── Draggable guest (sidebar + seat interior) ────────────────────────────────

function DraggableGuest({ guest, compact }: { guest: Guest; compact?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: guest.id,
    data: { guest },
  });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={`w-full h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing px-0.5 ${
          isDragging ? "opacity-0" : ""
        }`}
      >
        <p className="font-sans text-white text-xs leading-tight w-full truncate text-center font-medium">
          {guest.name.split(" ")[0]}
        </p>
        {guest.plusOne && (
          <p className="font-sans text-white/70 text-xs leading-none">+1</p>
        )}
        {guest.dietary && (
          <p className="font-sans text-white/60 text-xs leading-none truncate w-full text-center">•</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`bg-white border border-rose-soft/40 px-2 py-1.5 cursor-grab active:cursor-grabbing select-none ${
        isDragging ? "opacity-25" : ""
      }`}
    >
      <p className="font-sans text-sm font-medium text-bark truncate">{guest.name}</p>
      {guest.plusOne && guest.plusOneName && (
        <p className="font-sans text-bark/50 text-xs truncate">+1: {guest.plusOneName}</p>
      )}
      {guest.dietary && (
        <p className="font-sans text-rose-deep text-xs truncate">{guest.dietary}</p>
      )}
    </div>
  );
}

// ─── Individual seat slot ─────────────────────────────────────────────────────

function DroppableSeat({
  tableId, seatNum, guest, activeGuestId, style,
}: {
  tableId: string;
  seatNum: number;
  guest: Guest | undefined;
  activeGuestId: string | null;
  style: React.CSSProperties;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `${tableId}__seat__${seatNum}` });
  const beingDragged = !!guest && guest.id === activeGuestId;

  return (
    <div
      ref={setNodeRef}
      style={{ position: "absolute", width: S, height: S, ...style }}
      className={`border flex items-center justify-center transition-colors rounded-sm overflow-hidden ${
        guest && !beingDragged
          ? "bg-rose-deep border-rose-deep"
          : isOver
          ? "bg-rose-blush border-rose-deep border-dashed"
          : beingDragged
          ? "bg-rose-blush/30 border-rose-soft/40 border-dashed"
          : "bg-rose-blush/60 border-rose-soft/40 hover:border-rose-soft"
      }`}
    >
      {guest && !beingDragged ? (
        <DraggableGuest guest={guest} compact />
      ) : (
        <span className="font-sans text-bark/30 text-xs select-none">{seatNum}</span>
      )}
    </div>
  );
}

// ─── Circular table ───────────────────────────────────────────────────────────

function CircularTable({
  table, guestMap, activeGuestId, onRemove, onRename, onCapacityChange,
}: {
  table: Table;
  guestMap: Record<number, Guest>;
  activeGuestId: string | null;
  onRemove: () => void;
  onRename: (n: string) => void;
  onCapacityChange: (n: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(table.name);
  const seated = Object.keys(guestMap).length;
  const full = seated >= table.capacity;

  return (
    <div className="relative flex flex-col items-center" style={{ width: CANVAS }}>
      {/* Remove */}
      <button
        onClick={onRemove}
        title="Remove table"
        className="absolute top-0.5 right-0.5 z-10 text-bark/20 hover:text-rose-deep text-xs leading-none transition-colors"
      >
        ✕
      </button>

      {/* Canvas */}
      <div className="relative" style={{ width: CANVAS, height: CANVAS }}>
        {/* Connector lines from center to each seat */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={CANVAS}
          height={CANVAS}
        >
          {Array.from({ length: table.capacity }, (_, i) => {
            const angle = (i / table.capacity) * 2 * Math.PI - Math.PI / 2;
            const x = CENTER + R_SEAT * Math.cos(angle);
            const y = CENTER + R_SEAT * Math.sin(angle);
            return (
              <line
                key={i}
                x1={CENTER} y1={CENTER}
                x2={x} y2={y}
                stroke="#FFB3C4"
                strokeWidth="1"
                strokeOpacity="0.5"
              />
            );
          })}
        </svg>

        {/* Seat slots */}
        {Array.from({ length: table.capacity }, (_, i) => {
          const seatNum = i + 1;
          const angle = (i / table.capacity) * 2 * Math.PI - Math.PI / 2;
          const left = CENTER + R_SEAT * Math.cos(angle) - S / 2;
          const top  = CENTER + R_SEAT * Math.sin(angle) - S / 2;
          return (
            <DroppableSeat
              key={seatNum}
              tableId={table.id}
              seatNum={seatNum}
              guest={guestMap[seatNum]}
              activeGuestId={activeGuestId}
              style={{ left, top }}
            />
          );
        })}

        {/* Center circle */}
        <div
          className="absolute flex flex-col items-center justify-center rounded-full bg-ivory border border-gold/40"
          style={{ width: R_TABLE * 2, height: R_TABLE * 2, left: CENTER - R_TABLE, top: CENTER - R_TABLE }}
        >
          {editing ? (
            <input
              autoFocus
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={() => { onRename(nameInput); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter")  { onRename(nameInput); setEditing(false); }
                if (e.key === "Escape") { setNameInput(table.name); setEditing(false); }
              }}
              className="w-14 text-center font-serif text-xs text-bark bg-transparent border-b border-rose-deep focus:outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              title="Click to rename"
              className="font-serif text-bark text-xs hover:text-rose-deep transition-colors leading-tight text-center px-1"
            >
              {table.name}
            </button>
          )}
          <p className={`font-sans text-xs mt-0.5 ${full ? "text-rose-deep" : "text-bark/40"}`}>
            {seated}/
            <input
              type="number"
              value={table.capacity}
              min={1}
              max={20}
              onChange={(e) => onCapacityChange(Number(e.target.value))}
              className="w-5 bg-transparent focus:outline-none text-xs"
              title="Capacity"
            />
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Unassigned sidebar ───────────────────────────────────────────────────────

function UnassignedPanel({ guests }: { guests: Guest[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: "unassigned" });

  return (
    <div
      ref={setNodeRef}
      className={`w-52 shrink-0 flex flex-col border-r border-rose-soft/30 transition-colors ${
        isOver ? "bg-rose-soft/20" : "bg-rose-blush/40"
      }`}
    >
      <div className="px-4 pt-4 pb-3 border-b border-rose-soft/20">
        <p className="font-sans text-xs tracking-widest uppercase text-bark/50 mb-0.5">Unassigned</p>
        <p className="font-serif text-3xl text-bark leading-none">{guests.length}</p>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2" data-lenis-prevent>
        {guests.map((g) => (
          <DraggableGuest key={g.id} guest={g} />
        ))}
        {guests.length === 0 && (
          <p className="font-sans text-bark/30 text-xs text-center pt-8">All guests seated 🎉</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SeatingChart() {
  const [guests,     setGuests]     = useState<Guest[]>([]);
  const [tables,     setTables]     = useState<Table[]>([]);
  const [assignments, setAssignments] = useState<Record<string, SeatAssignment>>({});
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [activeGuest, setActiveGuest] = useState<Guest | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  // ── Load ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("seating_tables");
    if (stored) {
      setTables(JSON.parse(stored));
    } else {
      const defaults: Table[] = Array.from({ length: 10 }, (_, i) => ({
        id: `table-${i + 1}`, number: i + 1, name: `Table ${i + 1}`, capacity: 8,
      }));
      setTables(defaults);
      localStorage.setItem("seating_tables", JSON.stringify(defaults));
    }

    (async () => {
      setLoading(true);
      try {
        const [gRes, aRes] = await Promise.all([
          fetch("/api/seating/guests"),
          fetch("/api/seating/assignments"),
        ]);
        const { guests: g } = await gRes.json();
        const { assignments: a } = await aRes.json();
        setGuests(g);
        const map: Record<string, SeatAssignment> = {};
        a.forEach((row: { guestId: string; tableId: string; seatNumber: number }) => {
          if (row.tableId && row.seatNumber) map[row.guestId] = { tableId: row.tableId, seatNumber: row.seatNumber };
        });
        setAssignments(map);
      } catch (e) { console.error("Load failed", e); }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (tables.length > 0) localStorage.setItem("seating_tables", JSON.stringify(tables));
  }, [tables]);

  // ── Persist ─────────────────────────────────────────────────────────────
  async function persist(guestId: string, tableId: string | null, seatNumber: number | null) {
    setSaving(true);
    const guest     = guests.find((g) => g.id === guestId);
    const tableName = tableId ? (tables.find((t) => t.id === tableId)?.name ?? "") : null;
    try {
      await fetch("/api/seating/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId, guestName: guest?.name ?? "", tableId, tableName, seatNumber }),
      });
    } catch (e) { console.error("Save failed", e); }
    setSaving(false);
  }

  function assign(guestId: string, tableId: string | null, seatNumber: number | null) {
    setAssignments((prev) => {
      const next = { ...prev };
      if (!tableId || !seatNumber) delete next[guestId];
      else next[guestId] = { tableId, seatNumber };
      return next;
    });
    persist(guestId, tableId, seatNumber);
  }

  // ── Drag ────────────────────────────────────────────────────────────────
  function onDragStart(e: DragStartEvent) {
    setActiveGuest(guests.find((g) => g.id === e.active.id) ?? null);
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveGuest(null);
    const { active, over } = e;
    if (!over) return;

    const guestId = active.id as string;
    const dest    = over.id as string;

    if (dest === "unassigned") {
      assign(guestId, null, null);
      return;
    }

    if (dest.includes("__seat__")) {
      const [tableId, seatStr] = dest.split("__seat__");
      const seatNumber = parseInt(seatStr);

      // If destination seat is occupied, swap
      const occupantId = Object.keys(assignments).find(
        (id) => assignments[id]?.tableId === tableId && assignments[id]?.seatNumber === seatNumber && id !== guestId
      );
      if (occupantId) {
        const cur = assignments[guestId];
        assign(occupantId, cur?.tableId ?? null, cur?.seatNumber ?? null);
      }

      assign(guestId, tableId, seatNumber);
    }
  }

  // ── Tables ──────────────────────────────────────────────────────────────
  function addTable() {
    const next = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;
    setTables((p) => [...p, { id: `table-${Date.now()}`, number: next, name: `Table ${next}`, capacity: 8 }]);
  }

  function removeTable(tableId: string) {
    const affected = Object.keys(assignments).filter((gid) => assignments[gid]?.tableId === tableId);
    if (affected.length && !window.confirm(`Remove table and unassign ${affected.length} guest(s)?`)) return;
    affected.forEach((gid) => assign(gid, null, null));
    setTables((p) => p.filter((t) => t.id !== tableId));
  }

  function getGuestMap(tableId: string): Record<number, Guest> {
    const map: Record<number, Guest> = {};
    guests.forEach((g) => {
      const a = assignments[g.id];
      if (a?.tableId === tableId) map[a.seatNumber] = g;
    });
    return map;
  }

  const unassigned = guests.filter((g) => !assignments[g.id]);

  // ── Render ───────────────────────────────────────────────────────────────
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

        {/* Header */}
        <div className="bg-crimson-darkest text-rose-blush px-6 py-3 flex items-center justify-between shrink-0">
          <div>
            <h1 className="font-serif text-xl leading-none">Seating Chart</h1>
            <p className="font-sans text-rose-soft/50 text-xs mt-0.5">Jeffrey &amp; Katie · March 27, 2027</p>
          </div>
          <div className="flex items-center gap-5">
            {saving && <span className="font-sans text-rose-soft/50 text-xs animate-pulse">Saving…</span>}
            <span className="font-sans text-rose-blush/60 text-sm">
              {Object.keys(assignments).length} / {guests.length} seated
            </span>
            <button
              onClick={addTable}
              className="border border-rose-soft/30 text-rose-blush/80 font-sans text-xs tracking-widest uppercase px-4 py-1.5 hover:bg-crimson-dark transition-colors"
            >
              + Table
            </button>
            <a href="/" className="font-sans text-rose-soft/50 text-xs hover:text-rose-blush transition-colors">
              ← Site
            </a>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">
          <UnassignedPanel guests={unassigned} />

          <div className="flex-1 overflow-auto p-6" data-lenis-prevent>
            {tables.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="font-sans text-bark/30 text-sm">
                  No tables yet — click <strong>+ Table</strong> to add one.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-8">
                {tables.map((t) => (
                  <CircularTable
                    key={t.id}
                    table={t}
                    guestMap={getGuestMap(t.id)}
                    activeGuestId={activeGuest?.id ?? null}
                    onRemove={() => removeTable(t.id)}
                    onRename={(name) => setTables((p) => p.map((x) => x.id === t.id ? { ...x, name } : x))}
                    onCapacityChange={(cap) => setTables((p) => p.map((x) => x.id === t.id ? { ...x, capacity: cap } : x))}
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
