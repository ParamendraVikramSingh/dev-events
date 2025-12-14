import { NextResponse, type NextRequest } from 'next/server';
import { Types } from 'mongoose';
import connectDB from '@/lib/mongodb';
import { Event } from '@/database';
import type { IEvent } from '@/database/event.model';

type RouteContext = {
  // Next.js app router provides dynamic params as a Promise in generated route types.
  params: Promise<{
    slug: string;
  }>;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

// Accepts URL-safe slugs like "my-event-2025".
const isValidSlug = (slug: string): boolean =>
  /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 200;

type EventLean = IEvent & { _id: Types.ObjectId };

export async function GET(_req: NextRequest, ctx: RouteContext) {
  try {
    // Validate dynamic route param early to avoid unnecessary DB work.
    const { slug: rawSlug } = await ctx.params;
    const slug = isNonEmptyString(rawSlug) ? rawSlug.trim() : '';

    if (!slug) {
      return NextResponse.json({ message: 'Missing slug parameter.' }, { status: 400 });
    }

    if (!isValidSlug(slug)) {
      return NextResponse.json({ message: 'Invalid slug format.' }, { status: 400 });
    }

    await connectDB();

    // Use lean() for predictable, JSON-serializable objects.
    const event = await Event.findOne({ slug }).select('-__v').lean<EventLean>().exec();

    if (!event) {
      return NextResponse.json({ message: 'Event not found.' }, { status: 404 });
    }

    const { _id, ...rest } = event;

    return NextResponse.json(
      {
        message: 'Successfully fetched event.',
        event: { ...rest, _id: _id.toString() },
      },
      { status: 200 },
    );
  } catch (err) {
    // Log the full error server-side for debugging
    console.error('Error fetching event by slug:', err);
    
    const message = err instanceof Error ? err.message : 'Unknown error';

    return NextResponse.json(
      {
        message: 'Unexpected error while fetching event.',
        ...(process.env.NODE_ENV === 'development' && { error: message }),
      },
      { status: 500 },
    );
  }}
