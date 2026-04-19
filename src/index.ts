import { toUpper } from "@/utils";

export const greet = (name: string): string => `Hello, ${toUpper(name)}!`;

export const sum = (a: number, b: number): number => a + b;

export type Greeting = ReturnType<typeof greet>;
