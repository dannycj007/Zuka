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
