/**
 * Helper functions for date/time formatting and message templates
 */

/**
 * Format date for Spanish display
 * @param {string} dateString - Date in YYYY-MM-DD format
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const day = date.getDate();
  const month = date.toLocaleString('es-ES', { month: 'long' });
  const year = date.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/**
 * Format time for display (HH:MM)
 * @param {string} timeString - Time in HH:MM format
 * @returns {string} Formatted time string
 */
export function formatTime(timeString) {
  // Ensure time is in HH:MM format
  const [hours, minutes] = timeString.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

/**
 * Format booking message for tennis court
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} initialTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} Formatted booking message
 */
export function formatBookingMessage(date, initialTime, endTime) {
  const formattedDate = formatDate(date);
  const formattedInitialTime = formatTime(initialTime);
  const formattedEndTime = formatTime(endTime);
  
  return `Hola amigos! Quiero reservar una cancha el ${formattedDate} de ${formattedInitialTime} a ${formattedEndTime}`;
}

/**
 * Format group confirmation message
 * @param {string} senderName - Name of the person who made the reservation
 * @param {string} date - Date in YYYY-MM-DD format
 * @param {string} initialTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {string} Formatted confirmation message
 */
export function formatGroupConfirmation(senderName, date, initialTime, endTime) {
  const formattedDate = formatDate(date);
  const formattedInitialTime = formatTime(initialTime);
  const formattedEndTime = formatTime(endTime);
  
  const name = senderName || 'Usuario';
  return `${name} - Reserva confirmada para ${formattedDate} de ${formattedInitialTime} a ${formattedEndTime}`;
}

