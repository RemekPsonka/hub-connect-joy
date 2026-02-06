export interface GCalEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  location?: string;
  calendar_id: string;
  calendar_name: string;
  color: string;
  htmlLink: string;
}

export interface GCalCalendar {
  id: string;
  summary: string;
  backgroundColor: string;
  accessRole: string;
  primary: boolean;
}
