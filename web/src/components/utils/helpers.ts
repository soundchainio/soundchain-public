import { isValid } from "date-fns";
import { format, utcToZonedTime } from 'date-fns-tz';

interface FormatDateParams {
    date?: Date | string | null,
    timezone?: string,

}

export const formatDate = (params: FormatDateParams) => {
    const { date, timezone = 'America/New_York'} = params
    if (!date) return '';
  
    const dateToFormat = typeof date === 'string' ? new Date(date) : date;
  
    if (!isValid(dateToFormat)) return '';
  
    const dateFormatLocaleFormat = 'MM/dd/yyyy'
    const zonedDateTime = utcToZonedTime(dateToFormat, timezone);
  
    return format(zonedDateTime, dateFormatLocaleFormat, {
      timeZone: timezone,
    });
};