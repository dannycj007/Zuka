/**
 * Hand-written to match supabase/migrations/0001_init.sql.
 *
 * Once the project is live on Supabase, regenerate this from the real
 * database with `supabase gen types typescript` and replace this file —
 * this version exists so Phase 1 has type-safe Supabase clients before a
 * project exists to introspect.
 *
 * Shape follows @supabase/postgrest-js's GenericSchema/GenericTable: every
 * table needs Row/Insert/Update/Relationships, and the schema needs
 * Tables/Views/Functions, or the Supabase client's generics silently
 * degrade to `never`.
 */

export type RsvpStatus = "pending" | "yes" | "no" | "maybe";
export type EventStatus = "draft" | "live" | "closed";
export type EventLanguage = "en" | "sw";
export type DeliveryChannel = "whatsapp" | "sms";
export type DeliveryStatus = "queued" | "sent" | "delivered" | "read" | "failed";
export type DeliveryProvider = "nextsms" | "whatsapp";
export type CheckInResult = "valid" | "duplicate" | "invalid" | "wrong_event";

export type Database = {
  public: {
    Tables: {
      organisations: {
        Row: {
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          owner_user_id: string;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          owner_user_id: string;
          created_at: string;
        }>;
        Relationships: [];
      };
      themes: {
        Row: {
          id: string;
          name: string;
          config: Record<string, unknown>;
          preview_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          config?: Record<string, unknown>;
          preview_url?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          name: string;
          config: Record<string, unknown>;
          preview_url: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      events: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          event_type: string;
          starts_at: string;
          timezone: string;
          venue_name: string | null;
          venue_address: string | null;
          venue_lat: number | null;
          venue_lng: number | null;
          theme_id: string | null;
          language: EventLanguage;
          status: EventStatus;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          event_type: string;
          starts_at: string;
          timezone?: string;
          venue_name?: string | null;
          venue_address?: string | null;
          venue_lat?: number | null;
          venue_lng?: number | null;
          theme_id?: string | null;
          language?: EventLanguage;
          status?: EventStatus;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          org_id: string;
          name: string;
          event_type: string;
          starts_at: string;
          timezone: string;
          venue_name: string | null;
          venue_address: string | null;
          venue_lat: number | null;
          venue_lng: number | null;
          theme_id: string | null;
          language: EventLanguage;
          status: EventStatus;
          created_at: string;
        }>;
        Relationships: [];
      };
      guests: {
        Row: {
          id: string;
          event_id: string;
          full_name: string;
          salutation: string | null;
          phone_e164: string;
          email: string | null;
          category: string | null;
          table_label: string | null;
          seats_allotted: number;
          notes: string | null;
          dietary: string | null;
          invite_token: string;
          rsvp_status: RsvpStatus;
          rsvp_at: string | null;
          plus_ones_confirmed: number;
          latest_delivery_status: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          checked_in_gate: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          full_name: string;
          salutation?: string | null;
          phone_e164: string;
          email?: string | null;
          category?: string | null;
          table_label?: string | null;
          seats_allotted?: number;
          notes?: string | null;
          dietary?: string | null;
          invite_token: string;
          rsvp_status?: RsvpStatus;
          rsvp_at?: string | null;
          plus_ones_confirmed?: number;
          latest_delivery_status?: string | null;
          checked_in_at?: string | null;
          checked_in_by?: string | null;
          checked_in_gate?: string | null;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          event_id: string;
          full_name: string;
          salutation: string | null;
          phone_e164: string;
          email: string | null;
          category: string | null;
          table_label: string | null;
          seats_allotted: number;
          notes: string | null;
          dietary: string | null;
          invite_token: string;
          rsvp_status: RsvpStatus;
          rsvp_at: string | null;
          plus_ones_confirmed: number;
          latest_delivery_status: string | null;
          checked_in_at: string | null;
          checked_in_by: string | null;
          checked_in_gate: string | null;
          created_at: string;
        }>;
        Relationships: [];
      };
      scanner_codes: {
        Row: {
          id: string;
          event_id: string;
          code: string;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          code: string;
          active?: boolean;
          created_at?: string;
        };
        Update: Partial<{
          id: string;
          event_id: string;
          code: string;
          active: boolean;
          created_at: string;
        }>;
        Relationships: [];
      };
      scanner_sessions: {
        Row: {
          id: string;
          event_id: string;
          scanner_code_id: string;
          device_id: string;
          gate_label: string | null;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          scanner_code_id: string;
          device_id: string;
          gate_label?: string | null;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<{
          id: string;
          event_id: string;
          scanner_code_id: string;
          device_id: string;
          gate_label: string | null;
          created_at: string;
          last_seen_at: string;
        }>;
        Relationships: [];
      };
      delivery_events: {
        Row: {
          id: string;
          guest_id: string;
          event_id: string;
          channel: DeliveryChannel;
          status: DeliveryStatus;
          provider: DeliveryProvider;
          provider_message_id: string | null;
          error_code: string | null;
          error_message: string | null;
          attempt_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          event_id: string;
          channel: DeliveryChannel;
          status: DeliveryStatus;
          provider: DeliveryProvider;
          provider_message_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          attempt_number?: number;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      check_ins: {
        Row: {
          id: string;
          guest_id: string;
          event_id: string;
          scanned_at: string;
          scanned_by_user_id: string | null;
          scanner_session_id: string | null;
          gate_label: string | null;
          device_id: string | null;
          result: CheckInResult;
          synced_at: string | null;
          client_scanned_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          guest_id: string;
          event_id: string;
          scanned_at?: string;
          scanned_by_user_id?: string | null;
          scanner_session_id?: string | null;
          gate_label?: string | null;
          device_id?: string | null;
          result: CheckInResult;
          synced_at?: string | null;
          client_scanned_at: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
