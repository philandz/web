import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  categoryService,
  type CategoryType,
} from "@/services/category-service";
import { categoryKeys } from "@/lib/query-keys";

export function useCategoriesQuery(budgetId: string | null) {
  return useQuery({
    queryKey: categoryKeys.list(budgetId ?? ""),
    queryFn: () => categoryService.listCategories(budgetId!),
    enabled: Boolean(budgetId),
    retry: false,           // don't retry — service may not exist yet
    throwOnError: false,    // don't bubble up to error boundary
  });
}

export function useCreateCategoryMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      name: string;
      type: CategoryType;
      icon?: string;
      color?: string;
      plannedAmount?: number;
    }) => categoryService.createCategory(budgetId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.list(budgetId) }),
  });
}

export function useUpdateCategoryMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      categoryId,
      ...input
    }: {
      categoryId: string;
      name?: string;
      icon?: string;
      color?: string;
      plannedAmount?: number;
    }) => categoryService.updateCategory(budgetId, categoryId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.list(budgetId) }),
  });
}

export function useArchiveCategoryMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      categoryService.archiveCategory(budgetId, categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.list(budgetId) }),
  });
}

export function useDeleteCategoryMutation(budgetId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) =>
      categoryService.deleteCategory(budgetId, categoryId),
    onSuccess: () => qc.invalidateQueries({ queryKey: categoryKeys.list(budgetId) }),
  });
}
