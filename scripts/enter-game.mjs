/** Exercise the same title actions as a player; never bypass the title with a test flag. */
export async function enterGame(page) {
  await page.getByTestId("title-screen").waitFor();
  const resume = page.getByRole("button", { name: "Continuer", exact: true });
  if (await resume.isEnabled()) {
    await resume.focus();
    await page.keyboard.press("Enter");
  } else {
    const fresh = page.getByRole("button", {
      name: "Nouvelle partie",
      exact: true,
    });
    await fresh.focus();
    await page.keyboard.press("Enter");
    const start = page.getByRole("button", {
      name: "Commencer avec les aides pédagogiques",
      exact: true,
    });
    await start.focus();
    await page.keyboard.press("Enter");
  }
  await page.getByTestId("day").waitFor();
}
