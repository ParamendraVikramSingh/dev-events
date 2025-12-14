'use server'

import Event from '@/database/event.model';
import connectDB from "@/lib/mongodb";

export const getSimilarEventsBySlug = async (slug: string) => {
    try {
        await connectDB();

        const event = await Event.findOne({ slug });
        if (!event) return [];

        const similarEvents = await Event.find({
            _id: { $ne: event._id },       // Don’t include same event
            tags: { $in: event.tags }      // Must share at least one tag
        }).lean();

        return similarEvents;
    } catch (e) {
        console.error(e);
        return [];
    }
};
