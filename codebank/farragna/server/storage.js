import * as schema from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, like, sql } from "drizzle-orm";
export class DatabaseStorage {
    async getUser(id) {
        const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
        return user;
    }
    async upsertUser(userData) {
        const [user] = await db
            .insert(schema.users)
            .values(userData)
            .onConflictDoUpdate({
            target: schema.users.id,
            set: {
                ...userData,
                updatedAt: new Date(),
            },
        })
            .returning();
        return user;
    }
    async getVideos(options) {
        let query = db.select().from(schema.videos);
        const conditions = [];
        if (options?.status) {
            conditions.push(eq(schema.videos.moderationStatus, options.status));
        }
        if (options?.category) {
            conditions.push(eq(schema.videos.category, options.category));
        }
        if (options?.search) {
            conditions.push(like(schema.videos.caption, `%${options.search}%`));
        }
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        return await query.orderBy(desc(schema.videos.createdAt));
    }
    async getVideoById(id) {
        const [video] = await db.select().from(schema.videos).where(eq(schema.videos.id, id));
        return video;
    }

    async getVideoByCloudflareId(cloudflareId) {
        const [video] = await db.select().from(schema.videos).where(eq(schema.videos.cloudflareId, cloudflareId));
        return video;
    }
    async getVideosByUserId(userId) {
        return await db.select().from(schema.videos).where(eq(schema.videos.userId, userId)).orderBy(desc(schema.videos.createdAt));
    }

    async getEngagementsByUser(userId) {
        return await db.select().from(schema.engagements).where(eq(schema.engagements.userId, userId)).orderBy(desc(schema.engagements.createdAt));
    }
    async createVideo(video) {
        const [newVideo] = await db.insert(schema.videos).values(video).returning();
        return newVideo;
    }
    async updateVideo(id, data) {
        const [updated] = await db
            .update(schema.videos)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(schema.videos.id, id))
            .returning();
        return updated;
    }
    async deleteVideo(id) {
        await db.delete(schema.engagements).where(eq(schema.engagements.videoId, id));
        await db.delete(schema.favorites).where(eq(schema.favorites.videoId, id));
        await db.delete(schema.consentRecords).where(eq(schema.consentRecords.videoId, id));
        await db.delete(schema.videos).where(eq(schema.videos.id, id));
    }
    async incrementVideoViews(id) {
        await db.update(schema.videos).set({ views: sql `${schema.videos.views} + 1` }).where(eq(schema.videos.id, id));
    }
    async createConsentRecord(record) {
        const [newRecord] = await db.insert(schema.consentRecords).values(record).returning();
        return newRecord;
    }
    async getEngagement(userId, videoId) {
        const [engagement] = await db
            .select()
            .from(schema.engagements)
            .where(and(eq(schema.engagements.userId, userId), eq(schema.engagements.videoId, videoId)));
        return engagement;
    }
    async createEngagement(engagement) {
        const [newEngagement] = await db.insert(schema.engagements).values(engagement).returning();
        return newEngagement;
    }
    async deleteEngagement(userId, videoId) {
        await db
            .delete(schema.engagements)
            .where(and(eq(schema.engagements.userId, userId), eq(schema.engagements.videoId, videoId)));
    }
    async updateEngagementCounts(videoId, type, delta) {
        if (type === "like") {
            await db.update(schema.videos).set({ likes: sql `${schema.videos.likes} + ${delta}` }).where(eq(schema.videos.id, videoId));
        }
        else if (type === "superLike") {
            await db.update(schema.videos).set({ superLikes: sql `${schema.videos.superLikes} + ${delta}` }).where(eq(schema.videos.id, videoId));
        }
        else if (type === "megaLike") {
            await db.update(schema.videos).set({ megaLikes: sql `${schema.videos.megaLikes} + ${delta}` }).where(eq(schema.videos.id, videoId));
        }
    }
    async getFavorites(userId) {
        const result = await db
            .select()
            .from(schema.favorites)
            .innerJoin(schema.videos, eq(schema.favorites.videoId, schema.videos.id))
            .where(eq(schema.favorites.userId, userId))
            .orderBy(desc(schema.favorites.createdAt));
        return result.map((row) => ({
            ...row.favorites,
            video: row.videos,
        }));
    }
    async getFavorite(userId, videoId) {
        const [favorite] = await db
            .select()
            .from(schema.favorites)
            .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.videoId, videoId)));
        return favorite;
    }
    async createFavorite(favorite) {
        const [newFavorite] = await db.insert(schema.favorites).values(favorite).returning();
        return newFavorite;
    }
    async deleteFavorite(userId, videoId) {
        await db
            .delete(schema.favorites)
            .where(and(eq(schema.favorites.userId, userId), eq(schema.favorites.videoId, videoId)));
    }
}
export const storage = new DatabaseStorage();