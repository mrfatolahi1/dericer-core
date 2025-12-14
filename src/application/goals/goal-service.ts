import { StoragePort } from "../../ports/storage-port.js";
import { Goal } from "../../domain/goals/goal.js";
import { GoalId } from "../../shared/types.js";
import { TimePort } from "../../ports/time-port.js";
import { NotFoundError, ValidationError } from "../../shared/errors.js";

export interface CreateGoalCommand {
    name: string;
    targetAmountMinor: number;
    currency: string;
    targetDate?: string;
    note?: string;
}

export interface UpdateGoalCommand {
    name?: string;
    targetAmountMinor?: number;
    currency?: string;
    targetDate?: string | null;
    note?: string | null;
    isDeleted?: boolean;
}

function generateId(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

export async function createGoal(
    storage: StoragePort,
    time: TimePort,
    cmd: CreateGoalCommand
): Promise<Goal> {
    if (cmd.targetAmountMinor <= 0) {
        throw new ValidationError("Goal target amount must be positive.");
    }

    const now = time.now();
    const goal: Goal = {
        id: generateId() as GoalId,
        name: cmd.name,
        targetAmountMinor: cmd.targetAmountMinor,
        currency: cmd.currency,
        targetDate: cmd.targetDate,
        note: cmd.note,
        createdAt: now,
        updatedAt: now,
        isDeleted: false
    };

    await storage.saveGoal(goal);
    return goal;
}

export async function updateGoal(
    storage: StoragePort,
    time: TimePort,
    id: GoalId,
    changes: UpdateGoalCommand
): Promise<Goal> {
    const existing = await storage.getGoalById(id);
    if (!existing) {
        throw new NotFoundError("Goal not found.");
    }

    const now = time.now();
    const updated: Goal = {
        ...existing,
        name: changes.name ?? existing.name,
        targetAmountMinor:
            changes.targetAmountMinor ?? existing.targetAmountMinor,
        currency: changes.currency ?? existing.currency,
        targetDate:
            changes.targetDate === null ? undefined : changes.targetDate ?? existing.targetDate,
        note:
            changes.note === null ? undefined : changes.note ?? existing.note,
        isDeleted: changes.isDeleted ?? existing.isDeleted,
        updatedAt: now
    };

    await storage.saveGoal(updated);
    return updated;
}

export async function listActiveGoals(
    storage: StoragePort
): Promise<Goal[]> {
    const all = await storage.loadAllGoals();
    return all.filter((g) => !g.isDeleted);
}
