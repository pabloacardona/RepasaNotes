import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export type Question = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 80 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    topic: varchar("topic", { length: 60 }).notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notes_user_idx").on(t.userId)],
);

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    noteId: uuid("note_id").references(() => notes.id, { onDelete: "set null" }),
    title: varchar("title", { length: 160 }).notNull(),
    topic: varchar("topic", { length: 60 }).notNull(),
    difficulty: varchar("difficulty", { length: 10 }).notNull(),
    questions: jsonb("questions").$type<Question[]>().notNull(),
    answers: jsonb("answers").$type<number[]>(),
    score: integer("score"),
    total: integer("total").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("quizzes_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type Quiz = typeof quizzes.$inferSelect;
