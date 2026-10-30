import React from "react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Link as LinkIcon, 
  AlertCircle, 
  Sparkles,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";

interface DeadlineItem {
  id: string;
  title: string;
  dueDate: Date | string;
  dueTime?: string | null;
  status: string;
  sourceContext?: string | null;
}

interface EmailKeyInfoCardProps {
  deadlines?: DeadlineItem[];
  bodyText?: string | null;
  receivedAt?: Date | string;
}

export function EmailKeyInfoCard({
  deadlines = [],
  bodyText = "",
  receivedAt,
}: EmailKeyInfoCardProps) {
  // Extract registration/important URLs from text
  const extractedLinks = React.useMemo(() => {
    if (!bodyText) return [];
    const urlRegex = /(https?:\/\/[^\s<>"'()]+)/g;
    const matches = Array.from(new Set(bodyText.match(urlRegex) || []));
    
    return matches.slice(0, 3).map((url) => {
      let label = "Access Link";
      try {
        const u = new URL(url);
        if (u.hostname.includes("forms.gle") || u.hostname.includes("docs.google.com/forms")) {
          label = "Registration Form";
        } else if (u.hostname.includes("meet.google.com")) {
          label = "Google Meet Link";
        } else if (u.hostname.includes("zoom.us")) {
          label = "Zoom Meeting Link";
        } else if (u.hostname.includes("vitap.ac.in") || u.hostname.includes("vtop")) {
          label = "VTOP Portal";
        } else {
          label = u.hostname.replace(/^www\./, "");
        }
      } catch {
        // fallback
      }
      return { url, label };
    });
  }, [bodyText]);

  // Extract venue or hall mentions
  const extractedVenue = React.useMemo(() => {
    if (!bodyText) return null;
    const venueMatch = bodyText.match(/(?:venue|hall|auditorium|room|location)\s*[:\-]\s*([A-Za-z0-9\s,\-\.]+?)(?:\n|\r|\.|\,|$)/i);
    if (venueMatch && venueMatch[1].trim().length < 50) {
      return venueMatch[1].trim();
    }
    return null;
  }, [bodyText]);

  const hasDeadlines = deadlines.length > 0;
  const hasLinks = extractedLinks.length > 0;
  const hasVenue = Boolean(extractedVenue);

  if (!hasDeadlines && !hasLinks && !hasVenue) {
    return null;
  }

  return (
    <div className="bg-primary/[0.03] border-b border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
            Key Information At-a-Glance
          </h3>
        </div>
        <span className="text-[11px] text-muted-foreground font-medium">
          Original email content below
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Important Deadlines / Event Dates */}
        {hasDeadlines ? (
          deadlines.map((dl) => {
            const isCompleted = dl.status === "COMPLETED";
            const isDismissed = dl.status === "DISMISSED";
            const dueDateObj = new Date(dl.dueDate);

            return (
              <div
                key={dl.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-2xs"
              >
                <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                      {isCompleted ? "Completed Action" : isDismissed ? "Archived" : "Action Deadline"}
                    </span>
                    {isCompleted && (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  <h4 className="text-xs font-semibold text-foreground truncate mt-0.5" title={dl.title}>
                    {dl.title}
                  </h4>
                  <p className="text-xs font-bold text-foreground mt-1 flex items-center gap-1.5">
                    <span>{format(dueDateObj, "dd MMM yyyy")}</span>
                    {dl.dueTime && (
                      <span className="text-muted-foreground font-normal">
                        at {dl.dueTime}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-2xs">
            <div className="p-2 rounded-lg bg-muted text-muted-foreground shrink-0 mt-0.5">
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Email Timestamp
              </span>
              <p className="text-xs font-semibold text-foreground mt-0.5">
                {receivedAt ? format(new Date(receivedAt), "dd MMMM yyyy, hh:mm a") : "Standard Notice"}
              </p>
              <p className="text-[11px] text-muted-foreground">No pending deadlines recorded</p>
            </div>
          </div>
        )}

        {/* Venue / Location */}
        {hasVenue && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-2xs">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                Location / Venue
              </span>
              <h4 className="text-xs font-semibold text-foreground truncate mt-0.5" title={extractedVenue || undefined}>
                {extractedVenue}
              </h4>
              <p className="text-[11px] text-muted-foreground mt-0.5">Campus In-Person</p>
            </div>
          </div>
        )}

        {/* Action URLs / Forms */}
        {hasLinks && (
          <div className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border shadow-2xs">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <LinkIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                Action Links
              </span>
              <div className="flex flex-col gap-1 pt-0.5">
                {extractedLinks.map((item, idx) => (
                  <a
                    key={idx}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-primary hover:underline truncate block"
                    title={item.url}
                  >
                    {item.label} &rarr;
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
