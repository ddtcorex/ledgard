import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../../shared/api/client";
import type { BudgetView, RecurringBudget, BudgetTemplate, BudgetTemplateItem } from "../../../../shared/types/domain";

export function useBudgets(year: number, month: number) {
  return useQuery({
    queryKey: ["budgets", year, month],
    queryFn: () => apiClient.budgets(year, month)
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.createBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    }
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateBudget>[1] }) =>
      apiClient.updateBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    }
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.deleteBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    }
  });
}

export function useRecurringBudgets() {
  return useQuery({
    queryKey: ["recurring-budgets"],
    queryFn: apiClient.recurringBudgets
  });
}

export function useCreateRecurringBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.createRecurringBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-budgets"] });
    }
  });
}

export function useUpdateRecurringBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateRecurringBudget>[1] }) =>
      apiClient.updateRecurringBudget(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-budgets"] });
    }
  });
}

export function useDeleteRecurringBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.deleteRecurringBudget,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    }
  });
}

export function useBudgetTemplates() {
  return useQuery({
    queryKey: ["budget-templates"],
    queryFn: apiClient.budgetTemplates
  });
}

export function useBudgetTemplateItems(templateId: string | null) {
  return useQuery({
    queryKey: ["budget-template-items", templateId],
    queryFn: () => templateId ? apiClient.budgetTemplateItems(templateId) : Promise.resolve([]),
    enabled: !!templateId
  });
}

export function useCreateBudgetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.createBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-templates"] });
    }
  });
}

export function useUpdateBudgetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiClient.updateBudgetTemplate>[1] }) =>
      apiClient.updateBudgetTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-templates"] });
    }
  });
}

export function useDeleteBudgetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.deleteBudgetTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-templates"] });
    }
  });
}

export function useApplyBudgetTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { target_year: number; target_month: number } }) =>
      apiClient.applyBudgetTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["overview"] });
    }
  });
}
