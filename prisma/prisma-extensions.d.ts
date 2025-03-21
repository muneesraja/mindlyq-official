import { Prisma } from '@prisma/client';

// Extend the ReminderWhereInput type to include end_date
declare global {
  namespace Prisma {
    export interface ReminderWhereInput {
      end_date?: Date | Prisma.DateTimeFilter | null;
    }

    export interface ReminderCreateInput {
      end_date?: Date | string | null;
    }

    export interface ReminderUncheckedCreateInput {
      end_date?: Date | string | null;
    }
  }
}

export {};
