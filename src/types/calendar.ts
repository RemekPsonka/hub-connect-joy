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

export interface CalendarItem {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'gcal_event' | 'crm_task';
  color: string;
  allDay: boolean;
  location?: string;
  status?: string;
  htmlLink?: string;
  calendarName?: string;
  projectName?: string;
}
