export type Lang = "en" | "sw";

export type InviteDictionary = {
  invitedTo: (eventName: string) => string;
  greeting: (name: string) => string;
  eventDetails: string;
  when: string;
  where: string;
  getDirections: string;
  addToCalendar: string;
  googleCalendar: string;
  appleOutlookCalendar: string;
  table: string;
  seats: string;
  entryPass: string;
  entryPassHint: string;
  rsvpQuestion: string;
  rsvpYes: string;
  rsvpNo: string;
  rsvpMaybe: string;
  rsvpRecordedYes: string;
  rsvpRecordedNo: string;
  rsvpRecordedMaybe: string;
  countdownUntil: string;
  days: string;
  hours: string;
  minutes: string;
  happeningNow: string;
  notFoundTitle: string;
  notFoundMessage: string;
};

/**
 * The subset of InviteDictionary that's safe to pass to a Client
 * Component. invitedTo/greeting are functions — React's server/client
 * boundary rejects any prop containing a function that isn't a Server
 * Action, so those two must never cross it, even wrapped in a larger
 * object. TypeScript's Pick<> on a prop type does NOT strip properties
 * at runtime, so this needs an actual object rebuild, not just a type
 * annotation, at every call site that hands a dictionary to a Client
 * Component.
 */
export type ClientDictionary = Omit<InviteDictionary, "invitedTo" | "greeting">;

export function toClientDictionary(dict: InviteDictionary): ClientDictionary {
  return {
    eventDetails: dict.eventDetails,
    when: dict.when,
    where: dict.where,
    getDirections: dict.getDirections,
    addToCalendar: dict.addToCalendar,
    googleCalendar: dict.googleCalendar,
    appleOutlookCalendar: dict.appleOutlookCalendar,
    table: dict.table,
    seats: dict.seats,
    entryPass: dict.entryPass,
    entryPassHint: dict.entryPassHint,
    rsvpQuestion: dict.rsvpQuestion,
    rsvpYes: dict.rsvpYes,
    rsvpNo: dict.rsvpNo,
    rsvpMaybe: dict.rsvpMaybe,
    rsvpRecordedYes: dict.rsvpRecordedYes,
    rsvpRecordedNo: dict.rsvpRecordedNo,
    rsvpRecordedMaybe: dict.rsvpRecordedMaybe,
    countdownUntil: dict.countdownUntil,
    days: dict.days,
    hours: dict.hours,
    minutes: dict.minutes,
    happeningNow: dict.happeningNow,
    notFoundTitle: dict.notFoundTitle,
    notFoundMessage: dict.notFoundMessage,
  };
}

// Machine-quality Swahili, not reviewed by a native speaker — worth a
// pass from someone fluent before real guests see it.
const en: InviteDictionary = {
  invitedTo: (eventName) => `You're invited to ${eventName}`,
  greeting: (name) => `Dear ${name},`,
  eventDetails: "Event details",
  when: "When",
  where: "Where",
  getDirections: "Get directions",
  addToCalendar: "Add to calendar",
  googleCalendar: "Google Calendar",
  appleOutlookCalendar: "Apple / Outlook (.ics)",
  table: "Table",
  seats: "Seats",
  entryPass: "Your entry pass",
  entryPassHint: "Show this QR code at the door.",
  rsvpQuestion: "Will you attend?",
  rsvpYes: "Yes, I'll be there",
  rsvpNo: "No, I can't make it",
  rsvpMaybe: "Maybe",
  rsvpRecordedYes: "Thanks — you're confirmed!",
  rsvpRecordedNo: "Thanks for letting us know.",
  rsvpRecordedMaybe: "Thanks — we've noted you might attend.",
  countdownUntil: "Counting down",
  days: "days",
  hours: "hours",
  minutes: "minutes",
  happeningNow: "Happening now",
  notFoundTitle: "Invitation not found",
  notFoundMessage:
    "This link isn't valid. Please check the link you were sent, or contact the event organiser.",
};

const sw: InviteDictionary = {
  invitedTo: (eventName) => `Umealikwa kwenye ${eventName}`,
  greeting: (name) => `Mpendwa ${name},`,
  eventDetails: "Maelezo ya tukio",
  when: "Lini",
  where: "Wapi",
  getDirections: "Pata mwelekeo",
  addToCalendar: "Ongeza kwenye kalenda",
  googleCalendar: "Kalenda ya Google",
  appleOutlookCalendar: "Apple / Outlook (.ics)",
  table: "Meza",
  seats: "Viti",
  entryPass: "Kibali chako cha kuingia",
  entryPassHint: "Onyesha msimbo huu wa QR mlangoni.",
  rsvpQuestion: "Utahudhuria?",
  rsvpYes: "Ndiyo, nitakuwepo",
  rsvpNo: "Hapana, sitaweza",
  rsvpMaybe: "Labda",
  rsvpRecordedYes: "Asante — umethibitishwa!",
  rsvpRecordedNo: "Asante kwa kutujulisha.",
  rsvpRecordedMaybe: "Asante — tumeweka kumbukumbu kuwa huenda ukahudhuria.",
  countdownUntil: "Kuhesabu muda uliobaki",
  days: "siku",
  hours: "saa",
  minutes: "dakika",
  happeningNow: "Inaendelea sasa",
  notFoundTitle: "Mwaliko haujapatikana",
  notFoundMessage:
    "Kiungo hiki si sahihi. Tafadhali angalia kiungo ulichotumiwa, au wasiliana na mratibu wa tukio.",
};

const DICTIONARIES: Record<Lang, InviteDictionary> = { en, sw };

export function getDictionary(lang: string): InviteDictionary {
  return DICTIONARIES[lang as Lang] ?? DICTIONARIES.en;
}

/**
 * The SMS invite text itself (Phase 4). Kept deliberately short — SMS is
 * billed per 160-character segment in Tanzania, and per decision 5.2 all
 * the richness lives on the invite page, not in the message.
 */
export function getInviteSmsText(
  lang: string,
  fullName: string,
  eventName: string,
  inviteUrl: string,
): string {
  if (lang === "sw") {
    return `Habari ${fullName}! Umealikwa kwenye ${eventName}. Tazama mwaliko wako: ${inviteUrl}`;
  }
  return `Hi ${fullName}! You're invited to ${eventName}. View your invite: ${inviteUrl}`;
}
