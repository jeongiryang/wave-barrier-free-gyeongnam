import { expect, type Locator } from '@playwright/test';

/** Read the real form value without mutating the visually hidden native field. */
export function waveSelectNative(field: Locator) {
  return field.locator('xpath=ancestor-or-self::*[contains(concat(" ", normalize-space(@class), " "), " wave-select ")][1]').locator('select.wave-select-native');
}

/** Select through the visible menu; legacy native and labelled locators are read-only anchors. */
export async function chooseWaveOption(field: Locator, choice: string | { index: number }) {
  const native = waveSelectNative(field);
  await expect(native).toHaveCount(1);
  const trigger = native.locator('..').getByRole('combobox');
  await expect(trigger).toBeEnabled();
  const option = await native.evaluate((node: HTMLSelectElement, target) => {
    const options = Array.from(node.options);
    const index = typeof target === 'string' ? options.findIndex(item => item.value === target) : target.index;
    const item = options[index];
    return item ? { index, value: item.value, disabled: item.disabled || Boolean(item.closest('optgroup')?.disabled) } : null;
  }, choice);
  if (!option) throw new Error(`Unknown select option: ${JSON.stringify(choice)}`);
  if (option.disabled) throw new Error(`Cannot choose disabled option: ${option.value}`);
  // Language changes can rename the original locator. Retain this read-only
  // handle so the form-value assertion still checks the same submitted field.
  const nativeHandle = await native.elementHandle();
  await trigger.click();
  const menuId = await trigger.getAttribute('aria-controls');
  if (!menuId) throw new Error('The visible select did not open its listbox');
  const menu = field.page().locator(`[role="listbox"][id=${JSON.stringify(menuId)}]`);
  await menu.getByRole('option').nth(option.index).click();
  await expect.poll(() => nativeHandle!.evaluate(node => ({
    connected: node.isConnected,
    value: (node as HTMLSelectElement).value,
  }))).toEqual({ connected: true, value: option.value });
}
