// Utility functions for handling Eastern Time (Cleveland, Ohio timezone)

/**
 * Get current date/time in Eastern Time (America/New_York)
 * This automatically handles EST/EDT transitions
 * @returns {string} ISO string representation of current time in Eastern timezone
 */
export function getEasternTimeISO() {
  const now = new Date();
  
  // Use Intl.DateTimeFormat to get the Eastern time components
  const easternTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = easternTimeFormatter.formatToParts(now);
  const partsObj = {};
  parts.forEach(part => {
    partsObj[part.type] = part.value;
  });
  
  // Construct ISO string manually for Eastern Time
  const easternISO = `${partsObj.year}-${partsObj.month}-${partsObj.day}T${partsObj.hour}:${partsObj.minute}:${partsObj.second}.${now.getMilliseconds().toString().padStart(3, '0')}`;
  
  return easternISO;
}

/**
 * Get current date/time in Eastern Time as a Date object
 * @returns {Date} Date object representing current time in Eastern timezone
 */
export function getEasternTimeDate() {
  const easternISO = getEasternTimeISO();
  return new Date(easternISO);
}

/**
 * Convert any date to Eastern Time ISO string
 * @param {Date|string} date - Date to convert
 * @returns {string} ISO string representation in Eastern timezone
 */
export function toEasternTimeISO(date) {
  const inputDate = new Date(date);
  
  // Use Intl.DateTimeFormat to get the Eastern time components
  const easternTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  
  const parts = easternTimeFormatter.formatToParts(inputDate);
  const partsObj = {};
  parts.forEach(part => {
    partsObj[part.type] = part.value;
  });
  
  // Construct ISO string manually for Eastern Time
  const easternISO = `${partsObj.year}-${partsObj.month}-${partsObj.day}T${partsObj.hour}:${partsObj.minute}:${partsObj.second}.${inputDate.getMilliseconds().toString().padStart(3, '0')}`;
  
  return easternISO;
}

/**
 * Get formatted Eastern Time string for display
 * @param {Date|string} date - Date to format (optional, defaults to now)
 * @returns {string} Formatted date string in Eastern timezone
 */
export function formatEasternTime(date = null) {
  const targetDate = date ? new Date(date) : new Date();
  
  return targetDate.toLocaleString("en-US", {
    timeZone: "America/New_York",
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

/**
 * Check if Eastern Time is currently in Daylight Saving Time
 * @returns {boolean} True if currently in EDT, false if in EST
 */
export function isEasternDaylightTime() {
  const now = new Date();
  const january = new Date(now.getFullYear(), 0, 1);
  const july = new Date(now.getFullYear(), 6, 1);
  
  const janOffset = january.getTimezoneOffset();
  const julOffset = july.getTimezoneOffset();
  
  // If current offset is different from January (standard time), we're in daylight time
  return now.getTimezoneOffset() !== janOffset;
}

/**
 * Get current Eastern Time zone abbreviation (EST or EDT)
 * @returns {string} 'EST' or 'EDT'
 */
export function getEasternTimeZoneAbbr() {
  return isEasternDaylightTime() ? 'EDT' : 'EST';
}
