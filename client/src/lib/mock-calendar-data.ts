import { type Task } from "@shared/schema";

export interface MockUser {
  id: number;
  name: string;
  initials: string;
  color: string;
  avatar?: string;
}

export const MOCK_USERS: MockUser[] = [
  { id: 1, name: "German Martinez", initials: "GM", color: "bg-blue-500" },
  { id: 2, name: "Marcelo Santos", initials: "MS", color: "bg-green-500" },
  { id: 3, name: "Luis Chavez", initials: "LC", color: "bg-purple-500" },
  { id: 4, name: "Jose Rivera", initials: "JR", color: "bg-orange-500" },
  { id: 5, name: "Miguel Garcia", initials: "MG", color: "bg-pink-500" },
];

const TASK_TITLES = [
  "Unit 101 inspection",
  "Fix HVAC system",
  "Plumbing repair",
  "Paint touch-up",
  "Replace appliance",
  "Flooring repair",
  "Window replacement",
  "Lock change",
  "Smoke detector check",
  "Deep cleaning",
  "Pest control",
  "Landscaping work",
  "Pool maintenance",
  "Parking lot repair",
  "Elevator service",
  "Fire safety check",
  "Move-out inspection",
  "Move-in preparation",
  "Contractor meeting",
  "Vendor delivery",
];

const CATEGORIES: Array<"inspection" | "meeting" | "delivery" | "maintenance" | "repair"> = [
  "inspection",
  "meeting",
  "delivery",
  "maintenance",
  "repair",
];

const PRIORITIES: Array<"low" | "standard" | "high" | "urgent"> = [
  "low",
  "standard",
  "high",
  "urgent",
];

const STATUSES: Array<"pending" | "in-progress" | "completed"> = [
  "pending",
  "in-progress",
  "completed",
];

function getRandomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateMockTasksForMonth(
  year: number,
  month: number,
  tasksPerDay: { min: number; max: number } = { min: 5, max: 10 }
): Partial<Task>[] {
  const tasks: Partial<Task>[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let taskId = 1;

  for (let day = 1; day <= daysInMonth; day++) {
    const numTasks = getRandomInt(tasksPerDay.min, tasksPerDay.max);
    
    for (let t = 0; t < numTasks; t++) {
      const user = getRandomElement(MOCK_USERS);
      const hour = getRandomInt(7, 18);
      const minute = getRandomElement([0, 15, 30, 45]);
      const category = getRandomElement(CATEGORIES);
      const priority = getRandomElement(PRIORITIES);
      const status = getRandomElement(STATUSES);

      const startDate = new Date(year, month, day, hour, minute);

      tasks.push({
        id: taskId++,
        title: `${getRandomElement(TASK_TITLES)} - ${user.name.split(" ")[0]}`,
        description: `Task assigned to ${user.name}`,
        category,
        priority,
        status,
        startDate,
        assignedTo: user.name,
        createdBy: 1,
        location: `Unit ${getRandomInt(100, 500)}`,
        isRecurringTemplate: false,
        recurrenceType: null,
        recurrenceInterval: null,
        recurrenceEndDate: null,
        parentTaskId: null,
        apartmentNumber: `${getRandomInt(100, 500)}`,
      });
    }
  }

  return tasks;
}

export function getUserForTask(task: Partial<Task>): MockUser | undefined {
  if (!task.assignedTo) return undefined;
  return MOCK_USERS.find(u => task.assignedTo?.includes(u.name.split(" ")[0]));
}

export function getUserById(userId: number): MockUser | undefined {
  return MOCK_USERS.find(u => u.id === userId);
}
