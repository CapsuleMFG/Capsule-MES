import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useSchedule, useBlockedCount, useUpdatePosition, useMoveEntry } from '../hooks/useScheduling';
import FilterTabs from '../components/scheduling/FilterTabs';
import MachineColumn from '../components/scheduling/MachineColumn';
import ScheduleCard from '../components/scheduling/ScheduleCard';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import type { ScheduleEntryWithJob, MachineQueue } from '../types';

export default function SchedulingBoard() {
  const [activeTab, setActiveTab] = useState('All');
  const [activeDragEntry, setActiveDragEntry] = useState<ScheduleEntryWithJob | null>(null);

  const { data: queues, isLoading, error } = useSchedule();
  const { data: blockedCount } = useBlockedCount();
  const updatePosition = useUpdatePosition();
  const moveEntry = useMoveEntry();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const filteredQueues = queues?.filter((q: MachineQueue) => {
    if (activeTab === 'All') return true;
    return q.machineType === activeTab;
  }) || [];

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const entry = event.active.data.current?.entry as ScheduleEntryWithJob;
    if (entry) setActiveDragEntry(entry);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDragEntry(null);
    const { active, over } = event;
    if (!over || !queues) return;

    const activeEntry = active.data.current?.entry as ScheduleEntryWithJob;
    if (!activeEntry) return;

    const overId = String(over.id);

    // Dropped on a machine column (droppable zone)
    if (overId.startsWith('machine-')) {
      const targetMachineId = parseInt(overId.replace('machine-', ''));
      if (targetMachineId !== activeEntry.machineId) {
        const targetQueue = queues.find((q: MachineQueue) => q.machineId === targetMachineId);
        const newPosition = (targetQueue?.entries.length || 0) + 1;
        moveEntry.mutate({ id: activeEntry.id, machineId: targetMachineId, position: newPosition });
      }
      return;
    }

    // Dropped on another card
    const overEntry = over.data.current?.entry as ScheduleEntryWithJob | undefined;
    if (!overEntry) return;

    if (overEntry.machineId !== activeEntry.machineId) {
      // Cross-column move
      moveEntry.mutate({ id: activeEntry.id, machineId: overEntry.machineId, position: overEntry.position });
    } else {
      // Same column reorder
      if (activeEntry.position !== overEntry.position) {
        updatePosition.mutate({ id: activeEntry.id, position: overEntry.position });
      }
    }
  }, [queues, updatePosition, moveEntry]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-red-600">Failed to load scheduling board</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <FilterTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          blockedCount={blockedCount || 0}
        />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {filteredQueues.map((queue: MachineQueue) => (
            <MachineColumn key={queue.machineId} queue={queue} />
          ))}
        </div>

        <DragOverlay>
          {activeDragEntry && (
            <div className="w-[240px]">
              <ScheduleCard entry={activeDragEntry} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
