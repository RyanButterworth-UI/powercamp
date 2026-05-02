import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const campers = pgTable(
  'campers',
  {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    dob: text('dob'),
    gender: text('gender'),
    age: text('age'),
    grade: text('grade'),
    email: text('email'),
    camperCell: text('camper_cell'),
    medical: text('medical'),
    tshirt: text('tshirt'),
    church: text('church'),
    generalInfo: text('general_info'),
    friends: text('friends').array().default([]),
    parentName: text('parent_name'),
    parentPhone: text('parent_phone'),
    parentEmail: text('parent_email').notNull(),
    source: text('source').default('web'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => ({
    parentEmailIdx: index('campers_parent_email_idx').on(t.parentEmail),
    emailYearIdx: index('campers_email_year_idx').on(t.email, t.year),
  })
);

export const verificationCodes = pgTable(
  'verification_codes',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    consumed: boolean('consumed').default(false).notNull(),
    attempts: integer('attempts').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index('vcodes_email_idx').on(t.email),
  })
);

export type Camper = typeof campers.$inferSelect;
export type NewCamper = typeof campers.$inferInsert;
