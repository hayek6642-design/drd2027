import { relations, sql } from "drizzle-orm";
import { pgTable, varchar, text, integer, timestamp, boolean, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// Session storage table for Replit Auth
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);

// Users table for Replit Auth
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Video categories
export const CATEGORIES = [
    "entertainment",
    "music",
    "gaming",
    "sports",
    "education",
    "comedy",
    "news",
    "lifestyle",
    "technology",
    "travel",
];

// Moderation status types
export const MODERATION_STATUSES = ["review_required", "approved", "rejected"];

// Engagement types
export const ENGAGEMENT_TYPES = ["like", "superLike", "megaLike"];

// Videos table
export const videos = pgTable("videos", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").references(() => users.id),
    videoUrl: text("video_url").notNull(),
    thumbnailUrl: text("thumbnail_url"),
    caption: text("caption"),
    category: varchar("category", { length: 50 }).default("entertainment"),
    views: integer("views").default(0),
    likes: integer("likes").default(0),
    superLikes: integer("super_likes").default(0),
    megaLikes: integer("mega_likes").default(0),
    moderationStatus: varchar("moderation_status", { length: 20 }).default("review_required"),
    youtubeVideoId: varchar("youtube_video_id"),
    youtubeUrl: text("youtube_url"),
    copyrightConsent: boolean("copyright_consent").default(false),
    responsibilityConsent: boolean("responsibility_consent").default(false),
    cloudflareId: varchar("cloudflare_id"),
    status: varchar("status", { length: 20 }).default("uploading"),
    duration: integer("duration"),
    resolution: varchar("resolution", { length: 20 }),
    // uploaderType: varchar("uploader_type", { length: 20 }).default("guest"), // Temporarily commented out
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVideoSchema = createInsertSchema(videos).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    uploaderType: true, // Temporarily omit until DB migration
});

// Consent records for legal compliance
export const consentRecords = pgTable("consent_records", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    videoId: integer("video_id").notNull().references(() => videos.id),
    userId: varchar("user_id").references(() => users.id),
    copyrightAgreed: boolean("copyright_agreed").notNull(),
    responsibilityAgreed: boolean("responsibility_agreed").notNull(),
    youtubeRightsAgreed: boolean("youtube_rights_agreed").notNull(),
    ipAddress: varchar("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertConsentRecordSchema = createInsertSchema(consentRecords).omit({
    id: true,
    createdAt: true,
});

// User engagements (likes, super likes, mega likes)
export const engagements = pgTable("engagements", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").notNull().references(() => users.id),
    videoId: integer("video_id").notNull().references(() => videos.id),
    type: varchar("type", { length: 20 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertEngagementSchema = createInsertSchema(engagements).omit({
    id: true,
    createdAt: true,
});

// User favorites
export const favorites = pgTable("favorites", {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id").notNull().references(() => users.id),
    videoId: integer("video_id").notNull().references(() => videos.id),
    createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
    id: true,
    createdAt: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    videos: many(videos),
    engagements: many(engagements),
    favorites: many(favorites),
    consentRecords: many(consentRecords),
}));

export const videosRelations = relations(videos, ({ one, many }) => ({
    user: one(users, {
        fields: [videos.userId],
        references: [users.id],
    }),
    engagements: many(engagements),
    favorites: many(favorites),
    consentRecords: many(consentRecords),
}));

export const engagementsRelations = relations(engagements, ({ one }) => ({
    user: one(users, {
        fields: [engagements.userId],
        references: [users.id],
    }),
    video: one(videos, {
        fields: [engagements.videoId],
        references: [videos.id],
    }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
    user: one(users, {
        fields: [favorites.userId],
        references: [users.id],
    }),
    video: one(videos, {
        fields: [favorites.videoId],
        references: [videos.id],
    }),
}));

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
    user: one(users, {
        fields: [consentRecords.userId],
        references: [users.id],
    }),
    video: one(videos, {
        fields: [consentRecords.videoId],
        references: [videos.id],
    }),
}));