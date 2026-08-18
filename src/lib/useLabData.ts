import { useMemo } from "react";
import {
  useCustomers,
  useEmployees,
  useHolidays,
  useMachines,
  useProjects,
} from "@/lib/queries";
import { conflictIds, type Customer, type Employee, type Machine, type Project } from "@/lib/lab";

export function useLabData() {
  const machines = useMachines();
  const projects = useProjects();
  const customers = useCustomers();
  const employees = useEmployees();
  const holidays = useHolidays();

  const machineList = machines.data ?? [];
  const projectList = projects.data ?? [];
  const customerList = customers.data ?? [];
  const employeeList = employees.data ?? [];

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

  return {
    loading: machines.isLoading || projects.isLoading,
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
    employeeInitials: (id: string | null) => (id ? (employeeById.get(id)?.initials ?? "—") : "—"),
  };
}

export type LabData = ReturnType<typeof useLabData>;

export const projectLabel = (p: Project) => p.project_code || p.opportunity_code || p.title;
