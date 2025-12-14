import Image from "next/image";
import Link from "next/link";

interface Props {
  title: string;
  image?: string;
  slug?: string;
  location: string;
  date: string;
  time: string;
}

const EventCard = ({ title, image, slug, location, date, time }: Props) => {
  const posterSrc = typeof image === "string" ? image.trim() : "";
  const posterAlt = typeof title === "string" && title.trim().length > 0 ? `${title} poster` : "Event poster";

  // If slug is missing, avoid generating /events/undefined.
  const href = slug ? `/events/${slug}` : "#";

  return (
    <Link href={href} id="event-card" aria-disabled={!slug} tabIndex={!slug ? -1 : undefined}>
      {posterSrc ? (
        <Image src={posterSrc} alt={posterAlt} width={410} height={300} className="poster" />
      ) : (
        <div className="poster" aria-label={posterAlt} />
      )}

      <div className="flex flex-row gap-2">
        <Image src="/icons/pin.svg" alt="location" width={14} height={14} />
        <p>{location}</p>
      </div>

      <p className="title">{title}</p>

      <div className="datetime">
        <div>
          <Image src="/icons/calendar.svg" alt="date" width={14} height={14} />
          <p>{date}</p>
        </div>

        <div>
          <Image src="/icons/clock.svg" alt="time" width={14} height={14} />
          <p>{time}</p>
        </div>
      </div>
    </Link>
  );
};

export default EventCard;
