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
    consentGeneral: text('consent_general'),
    consentLocation: text('consent_location'),
    consentRisk: text('consent_risk'),
    consentPowerCamp: text('consent_power_camp'),
    consentBehaviour: text('consent_behaviour'),
    consentPhoto: text('consent_photo'),
    consentEmergencyName: text('consent_emergency_name'),
    consentEmergencyContact: text('consent_emergency_contact'),
    consentMedicalAidName: text('consent_medical_aid_name'),
    consentMedicalAidNumber: text('consent_medical_aid_number'),
    consentDate: text('consent_date'),
    consentAcceptedAt: timestamp('consent_accepted_at'),
    paymentReceivedAt: timestamp('payment_received_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('campers_parent_email_idx').on(t.parentEmail),
    index('campers_email_year_idx').on(t.email, t.year),
  ]
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
  (t) => [index('vcodes_email_idx').on(t.email)]
);

export type Camper = typeof campers.$inferSelect;
export type NewCamper = typeof campers.$inferInsert;

export const leaders = pgTable(
  'leaders',
  {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    email: text('email').notNull(),
    cell: text('cell'),
    gender: text('gender'),
    age: text('age'),
    grade: text('grade'),
    church: text('church'),
    tshirt: text('tshirt'),
    parentName: text('parent_name'),
    parentPhone: text('parent_phone'),
    parentEmail: text('parent_email'),
    applicationNotes: text('application_notes'),
    status: text('status').default('pending').notNull(),
    approvedByNeil: boolean('approved_by_neil').default(false).notNull(),
    approvedAt: timestamp('approved_at'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (t) => [
    index('leaders_year_idx').on(t.year),
    index('leaders_email_idx').on(t.email),
  ]
);

export type Leader = typeof leaders.$inferSelect;
export type NewLeader = typeof leaders.$inferInsert;

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: serial('id').primaryKey(),
    email: text('email').notNull().unique(),
    subscribed: boolean('subscribed').default(true).notNull(),
    unsubscribedAt: timestamp('unsubscribed_at'),
    source: text('source').default('registration'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [index('subscriptions_email_idx').on(t.email)]
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
