import { Locator, Page } from '@playwright/test';

/**
 * Simulate a pointer-based drag from `source` to `target`.
 *
 * Playwright's built-in `locator.dragTo()` uses HTML5 drag events, which
 * works for the legacy HTML5 DnD used by the Offering Kanban. The same
 * helper also works for dnd-kit (pointer-based) by walking the mouse
 * through several intermediate steps to trigger drag-over handlers.
 */
export async function pointerDrag(
  page: Page,
  source: Locator,
  target: Locator,
): Promise<void> {
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error('pointerDrag: source or target has no bounding box');
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // Move in steps so dnd-kit's pointer sensor activates.
  await page.mouse.move(startX + 5, startY + 5, { steps: 5 });
  await page.mouse.move(endX, endY, { steps: 20 });
  await page.mouse.up();

  // Try the HTML5 path as well (no-op if listeners absent), so the same
  // helper works for both DnD implementations used in the app.
  try {
    await source.dragTo(target, { timeout: 2000 });
  } catch {
    // ignore — pointer drag above is the primary path
  }
}
