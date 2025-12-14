import { CategoryId } from "../../shared/types.js";

export interface Category {
    id: CategoryId;
    name: string;
    parentId: CategoryId | null;
    isDeleted: boolean;
}

export function buildCategoryIndex(
    categories: Category[]
): Map<CategoryId, Category> {
    return new Map(categories.map((c) => [c.id, c]));
}

export function getAncestorCategoryIds(
    categoryId: CategoryId,
    index: Map<CategoryId, Category>
): CategoryId[] {
    const ancestors: CategoryId[] = [];
    let current = index.get(categoryId) ?? null;

    while (current && current.parentId) {
        ancestors.push(current.parentId);
        current = index.get(current.parentId) ?? null;
    }

    return ancestors;
}

export function getDescendantCategoryIds(
    rootId: CategoryId,
    categories: Category[]
): CategoryId[] {
    const result: CategoryId[] = [];
    const childrenMap = new Map<CategoryId, CategoryId[]>();

    for (const c of categories) {
        if (!c.parentId) continue;
        const arr = childrenMap.get(c.parentId) ?? [];
        arr.push(c.id);
        childrenMap.set(c.parentId, arr);
    }

    const stack: CategoryId[] = [...(childrenMap.get(rootId) ?? [])];

    while (stack.length > 0) {
        const id = stack.pop() as CategoryId;
        result.push(id);
        const children = childrenMap.get(id);
        if (children) {
            stack.push(...children);
        }
    }

    return result;
}
