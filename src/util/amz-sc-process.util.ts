/**
 * Waits for the user to press the Enter key.
 * @returns A promise that resolves when Enter is pressed.
 */
export async function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.once("data", () => {
      resolve();
    });
  });
}

/**
 * Sleeps for a random duration between the specified lower and upper bounds (in milliseconds).
 * This is useful to mimic human-like behavior in web scraping.
 * @param lower The lower bound of the sleep duration in milliseconds.
 * @param upper The upper bound of the sleep duration in milliseconds.
 */
export async function randomSleep(lower: number, upper: number): Promise<void> {
  const delayMs = lower + Math.random() * (upper - lower);
  console.log(`Sleeping for ${Math.round(delayMs)} ms to mimic human behavior...`);
  await new Promise((resolve) => setTimeout(resolve, delayMs));
}
