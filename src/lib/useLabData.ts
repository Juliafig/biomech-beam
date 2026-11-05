import { useMemo } from "react";
import {
  useCustomers,
  useEmployees,
  useHolidays,
  useMachines,
  useProjects,
} from "@/lib/queries";
import { conflictIds, type Customer, type Employee, type Machine, type Project } from "@/lib/lab";

// Stable empty arrays so memoised values don't recompute on every render while loading.
const EMPTY_MACHINES: Machine[] = [];
const EMPTY_PROJECTS: Project[] = [];
const EMPTY_CUSTOMERS: Customer[] = [];
const EMPTY_EMPLOYEES: Employee[] = [];

export function useLabData() {
  const machines = useMachines();
  const projects = useProjects();
  const customers = useCustomers();
  const employees = useEmployees();
  const holidays = useHolidays();

  const machineList = machines.data ?? EMPTY_MACHINES;
  const projectList = projects.data ?? EMPTY_PROJECTS;
  const customerList = customers.data ?? EMPTY_CUSTOMERS;
  const employeeList = employees.data ?? EMPTY_EMPLOYEES;

  const holidaySet = useMemo(
    () => new Set((holidays.data ?? []).map((h) => h.day)),
    [holidays.data],
  );
  const conflicts = useMemo(() => conflictIds(projectList), [projectList]);

  const machineById = useMemo(
    () => new Map<string, Machine>(machineList.map((m) => [m.id, m])),
    [machineList],
  );
  const customerById = useMemo(
    () => new Map<string, Customer>(customerList.map((c) => [c.id, c])),
    [customerList],
  );
  const employeeById = useMemo(
    () => new Map<string, Employee>(employeeList.map((e) => [e.id, e])),
    [employeeList],
  );

  const loading = machines.isLoading || projects.isLoading;

  // Memoised so pages/components can depend on `data` without recomputing every render.
  return useMemo(
    () => ({
      loading,
      machines: machineList,
      projects: projectList,
      customers: customerList,
      employees: employeeList,
      holidaySet,
      conflicts,
      machineById,
      customerById,
      employeeById,
      machineCode: (id: string | null) => (id ? (machineById.get(id)?.code ?? "—") : "—"),
      customerName: (id: string | null) => (id ? (customerById.get(id)?.name ?? "—") : "—"),
      employeeInitials: (id: string | null) =>
        id ? (employeeById.get(id)?.initials ?? "—") : "—",
    }),
    [
      loading,
      machineList,
      projectList,
      customerList,
      employeeList,
      holidaySet,
      conflicts,
      machineById,
      customerById,
      employeeById,
    ],
  );
}

export type LabData = ReturnType<typeof useLabData>;

export const projectLabel = (p: Project) => p.project_code || p.opportunity_code || p.title;
