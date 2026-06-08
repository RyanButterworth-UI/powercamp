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
    // The post-approval leader registration form mirrors the camper form
    // (minus the parent block). These columns hold the same details a camper
    // gives — date of birth, medical/allergy notes, "anything else", and the
    // full consent block (six agreements + emergency contact + medical aid),
    // worded in the first person for an adult registering themselves.
    dob: text('dob'),
    medical: text('medical'),
    dietary: text('dietary'),
    generalInfo: text('general_info'),
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
    status: text('status').default('pending').notNull(),
    approvedByNeil: boolean('approved_by_neil').default(false).notNull(),
    approvedAt: timestamp('approved_at'),
    // Set when the admin marks the leader as having paid for camp. Mirrors
    // the camper-side paymentReceivedAt — same shape, same lifecycle, same
    // best-effort sheet+email side-effects on mark-paid.
    paymentReceivedAt: timestamp('payment_received_at'),
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

// Teams — four mixed-age, mixed-gender teams that compete at camp.
// Drag-and-drop in the admin shuffles campers between teams; the
// auto-suggest feature uses the friends array on campers to keep
// pre-existing pairs together where it can while still spreading
// ages evenly.
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  name: text('name').notNull(),
  // Hex colour the admin UI tints the team's column with. Optional;
  // a small palette in the UI generates one when the admin doesn't.
  color: text('color'),
  // Optional captain — points at a leader. Nullable so the admin can
  // create a team before deciding who's leading it.
  captainLeaderId: integer('captain_leader_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('teams_year_idx').on(t.year),
]);

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

// One row per camper-per-year; reassigning to a different team updates
// this row rather than creating a new one. The composite index on
// (year, camperId) keeps lookups fast without enforcing uniqueness at
// the schema level — that constraint is enforced in the assignment
// endpoint with an upsert.
export const teamAssignments = pgTable('team_assignments', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  camperId: integer('camper_id').notNull(),
  teamId: integer('team_id').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('team_assignments_year_camper_idx').on(t.year, t.camperId),
  index('team_assignments_team_idx').on(t.teamId),
]);

export type TeamAssignment = typeof teamAssignments.$inferSelect;
export type NewTeamAssignment = typeof teamAssignments.$inferInsert;

// Bunks — sleeping arrangements. Single-gender per safeguarding policy.
// Each bunk is led by exactly one leader (also single-gender — enforced
// at the assignment endpoint by matching gender to bunk gender).
export const bunks = pgTable('bunks', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  name: text('name').notNull(),
  gender: text('gender').notNull(), // 'Male' | 'Female'
  leaderId: integer('leader_id'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('bunks_year_idx').on(t.year),
]);

export type Bunk = typeof bunks.$inferSelect;
export type NewBunk = typeof bunks.$inferInsert;

export const bunkAssignments = pgTable('bunk_assignments', {
  id: serial('id').primaryKey(),
  year: integer('year').notNull(),
  camperId: integer('camper_id').notNull(),
  bunkId: integer('bunk_id').notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('bunk_assignments_year_camper_idx').on(t.year, t.camperId),
  index('bunk_assignments_bunk_idx').on(t.bunkId),
]);

export type BunkAssignment = typeof bunkAssignments.$inferSelect;
export type NewBunkAssignment = typeof bunkAssignments.$inferInsert;

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

// App-wide settings — a single-row table (id is pinned to 1). Currently
// holds the master registrations-open switch the admin toggles to close the
// public form once camp is full. Kept as its own table (rather than an env
// var) so it can be flipped at runtime without a redeploy.
export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  registrationsOpen: boolean('registrations_open').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Settings = typeof settings.$inferSelect;

// Waiting list — populated when registrations are closed and a family asks
// to be added (via the closed-screen form, or manually by an admin from an
// email). Separate from campers: these are not registrations, just a queue
// of interested families to contact if a spot opens up.
export const waitlist = pgTable(
  'waitlist',
  {
    id: serial('id').primaryKey(),
    year: integer('year').notNull(),
    camperName: text('camper_name').notNull(),
    parentName: text('parent_name'),
    parentEmail: text('parent_email').notNull(),
    phone: text('phone'),
    grade: text('grade'),
    note: text('note'),
    // 'waiting' | 'contacted' | 'placed' | 'declined' — free-text so the
    // admin UI can evolve the workflow without a migration.
    status: text('status').default('waiting').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('waitlist_year_idx').on(t.year)]
);

export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
