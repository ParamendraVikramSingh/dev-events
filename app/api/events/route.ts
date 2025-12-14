import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import connectDB from '@/lib/mongodb';
import Event from '@/database/event.model';
import type { IEvent } from '@/database/event.model';

type CloudinaryUploadResult = {
  secure_url: string;
};

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const getRequiredString = (formData: FormData, key: string): string => {
  const value = formData.get(key);
  if (!isNonEmptyString(value)) throw new Error(`${key} is required.`);
  return value.trim();
};

// Supports either repeated keys (agenda=a&agenda=b), JSON string ("[\"a\",\"b\"]"), or CSV/newline.
const parseStringArray = (formData: FormData, key: string): string[] => {
  const rawItems = formData.getAll(key).filter((v): v is string => typeof v === 'string');
  const trimmed = rawItems.map((s) => s.trim()).filter((s) => s.length > 0);

  if (trimmed.length === 0) throw new Error(`${key} is required.`);
  if (trimmed.length > 1) return trimmed;

  const single = trimmed[0];

  // JSON array string: ["Intro","Q&A"]
  if (single.startsWith('[')) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(single);
    } catch {
      throw new Error(`${key} must be a valid JSON array.`);
    }
    if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string' && x.trim().length > 0)) {
      throw new Error(`${key} must be an array of non-empty strings.`);
    }
    return parsed.map((x) => x.trim());
  }
  // CSV/newlines: "Intro, Q&A" or "Intro\nQ&A"
  return single
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
};

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

    const file = formData.get('image');
    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'Image file is required.' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.' },
        { status: 400 }
      );
    }

    // Validate file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: 'File size exceeds 5MB limit.' },
        { status: 400 }
      );
    }

    let tags = JSON.parse(formData.get('tags') as string);
    let agenda = JSON.parse(formData.get('agenda') as string);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const uploadedResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: 'image', folder: 'DevEvent' }, (error, result) => {
          if (error) return reject(error);
          if (!result?.secure_url) return reject(new Error('Image upload failed.'));
          resolve({ secure_url: result.secure_url });
        })
        .end(buffer);
    });

    // Build a strongly-typed payload (avoids accidentally storing arrays as a single string).
    const eventData: Omit<IEvent, 'slug' | 'createdAt' | 'updatedAt'> = {
      title: getRequiredString(formData, 'title'),
      description: getRequiredString(formData, 'description'),
      overview: getRequiredString(formData, 'overview'),
      image: uploadedResult.secure_url,
      venue: getRequiredString(formData, 'venue'),
      location: getRequiredString(formData, 'location'),
      date: getRequiredString(formData, 'date'),
      time: getRequiredString(formData, 'time'),
      mode: getRequiredString(formData, 'mode'),
      audience: getRequiredString(formData, 'audience'),
      agenda: parseStringArray(formData, 'agenda'),
      organizer: getRequiredString(formData, 'organizer'),
      tags: parseStringArray(formData, 'tags'),
    };


    const createdEvent = await Event.create({
        ...eventData,
        tags: tags,
        agenda: agenda,
    });

    return NextResponse.json(
      { message: 'Successfully created event', event: createdEvent },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown Error';

    // Surface input errors as 400; everything else as 500.
    const isBadRequest =
      typeof message === 'string' &&
      (message.endsWith('is required.') || message.includes('must be an array'));

    return NextResponse.json(
      { message: 'Event Creation Failed', error: message },
      { status: isBadRequest ? 400 : 500 },
    );
  }
}

export async function GET() {
  try {
    await connectDB();

    const events = await Event.find().sort({ createdAt: -1 }).lean().exec();

    return NextResponse.json({ message: 'Successfully fetched events', events }, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown Error';
    return NextResponse.json(
      { message: 'Event fetching failed', error: message },
      { status: 500 },
    );
  }
}
