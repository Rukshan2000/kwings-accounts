'use client';

import { useApi } from './api';
import type { Account, Category, Project } from './types';

/** Accounts, categories and projects for form selects and filters. */
export function useRefs() {
  const accounts = useApi<Account[]>('/accounts');
  const categories = useApi<Category[]>('/categories');
  const projects = useApi<Project[]>('/projects');
  return {
    accounts: accounts.data ?? [],
    categories: categories.data ?? [],
    projects: projects.data ?? [],
    reloadRefs: () => Promise.all([accounts.reload(), categories.reload(), projects.reload()]),
  };
}
