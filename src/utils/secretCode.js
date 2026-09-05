/**
 * Creates a promise-based secret code dialog
 * @param {string} secretCode - The correct secret code to validate against
 * @returns {Promise<boolean>} - Returns true if user enters correct code, false otherwise
 */
export function promptSecretCode(secretCode = "madhu") {
  return new Promise((resolve) => {
    const input = window.prompt("Enter secret code to proceed:", "");
    if (input === null) {
      // User clicked Cancel
      resolve(false);
    } else if (input === secretCode) {
      resolve(true);
    } else {
      resolve(false);
    }
  });
}
