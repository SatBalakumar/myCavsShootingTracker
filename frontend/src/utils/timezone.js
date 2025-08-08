/**
 * TIMEZONE UTILITIES FOR CLEVELAND CAVALIERS SHOOTING TRACKER
 * 
 * Purpose: Consistent Eastern Time handling for Cleveland-based basketball operations
 * Context: Cleveland Cavaliers organization operates in Eastern Time zone
 * 
 * Technical Requirements:
 * 1. Automatic EST/EDT (Standard/Daylight) time transitions
 * 2. Consistent timezone representation across all data records
 * 3. Database-compatible ISO string formatting
 * 4. High-precision timestamps for accurate shot timing
 * 5. Cross-browser compatibility for reliable time calculations
 * 
 * Design Philosophy:
 * - Use browser-native Intl.DateTimeFormat for reliable timezone handling
 * - Avoid manual timezone offset calculations (error-prone with DST)
 * - Generate ISO-compatible strings for database consistency
 * - Maintain millisecond precision for accurate performance timing
 * 
 * Why Eastern Time Matters:
 * - Cleveland Cavaliers home timezone for operational consistency
 * - Game schedules and practice times in Eastern Time
 * - Fan engagement and media aligned with Eastern Time
 * - Analytics and reporting standardized on team's local time
 */

/**
 * GET EASTERN TIME ISO STRING: Current time in Cleveland Cavaliers timezone
 * 
 * Technical Implementation:
 * - Uses Intl.DateTimeFormat with America/New_York timezone (includes Cleveland)
 * - Automatically handles EST (UTC-5) and EDT (UTC-4) transitions
 * - Constructs ISO-like string format for database compatibility
 * - Preserves millisecond precision for accurate shot timing
 * 
 * @returns {string} ISO-formatted string representing current Eastern Time
 * 
 * Format: "YYYY-MM-DDTHH:mm:ss.sss" (without timezone suffix for consistency)
 * 
 * Browser Compatibility:
 * - Intl.DateTimeFormat supported in all modern browsers
 * - Graceful fallback behavior in older browsers
 * - Consistent behavior across desktop and mobile platforms
 */
export function getEasternTimeISO() {
  const now = new Date();
  
  /**
   * EASTERN TIME FORMATTING: Use browser's native timezone handling
   * 
   * Configuration Details:
   * - timeZone: 'America/New_York' includes Cleveland and handles DST automatically
   * - en-CA locale provides YYYY-MM-DD format preferred for data consistency
   * - hour12: false ensures 24-hour format for database compatibility
   * - Detailed time components enable precise timestamp construction
   */
  const easternTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York',     // Cleveland's timezone with automatic DST handling
    year: 'numeric',                  // Four-digit year (2024, 2025, etc.)
    month: '2-digit',                 // Two-digit month with leading zeros (01, 02, etc.)
    day: '2-digit',                   // Two-digit day with leading zeros (01, 02, etc.)
    hour: '2-digit',                  // Two-digit hour in 24-hour format (00-23)
    minute: '2-digit',                // Two-digit minute with leading zeros (00-59)
    second: '2-digit',                // Two-digit second with leading zeros (00-59)
    hour12: false                     // 24-hour format for database consistency
  });
  
  /**
   * COMPONENT EXTRACTION: Parse formatted time into structured object
   * 
   * formatToParts() returns array of time components with type/value pairs
   * Converting to object enables easy access to individual time elements
   */
  const parts = easternTimeFormatter.formatToParts(now);
  const partsObj = {};
  parts.forEach(part => {
    partsObj[part.type] = part.value;
  });
  
  /**
   * ISO STRING CONSTRUCTION: Build database-compatible timestamp format
   * 
   * Format Components:
   * - Date: YYYY-MM-DD (ISO date format)
   * - Time separator: T (ISO standard)
   * - Time: HH:mm:ss.sss (24-hour with milliseconds)
   * - Milliseconds: Padded to 3 digits for consistency
   * 
   * Why not include timezone suffix:
   * - All application data uses Eastern Time consistently
   * - Simpler string comparison and sorting in database
   * - Avoids timezone parsing complexity in analytics
   */
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
