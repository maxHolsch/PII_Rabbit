/**
 * React state synchronization utilities
 * Helps inject values into React-controlled inputs
 */

import { logger } from './logger';

/**
 * Set value of a React-controlled input
 * This properly triggers React's change events
 */
export function setReactInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
): boolean {
  try {
    // Get React internal instance
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    // Set value using native setter
    if (element instanceof HTMLInputElement && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, value);
    } else if (element instanceof HTMLTextAreaElement && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, value);
    } else {
      element.value = value;
    }

    // Dispatch input event
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    logger.debug('react-sync:set-value', 'Value set successfully', {
      valueLength: value.length,
    });

    return true;
  } catch (error) {
    logger.error('react-sync:set-value', 'Failed to set value', {
      error: String(error),
    });
    return false;
  }
}

/**
 * Set content of a contenteditable element
 */
export function setContentEditableValue(
  element: HTMLElement,
  value: string
): boolean {
  try {
    // Set text content
    element.textContent = value;

    // Dispatch input event
    const inputEvent = new Event('input', { bubbles: true });
    element.dispatchEvent(inputEvent);

    // Dispatch change event
    const changeEvent = new Event('change', { bubbles: true });
    element.dispatchEvent(changeEvent);

    // Move cursor to end
    const range = document.createRange();
    const selection = window.getSelection();

    if (element.firstChild) {
      range.setStart(element.firstChild, element.textContent?.length || 0);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }

    logger.debug('react-sync:set-contenteditable', 'Content set successfully', {
      valueLength: value.length,
    });

    return true;
  } catch (error) {
    logger.error('react-sync:set-contenteditable', 'Failed to set content', {
      error: String(error),
    });
    return false;
  }
}

/**
 * Trigger click event on React element
 */
export function clickReactElement(element: HTMLElement): boolean {
  try {
    // Dispatch mouse events
    element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    logger.debug('react-sync:click', 'Click triggered successfully');

    return true;
  } catch (error) {
    logger.error('react-sync:click', 'Failed to trigger click', {
      error: String(error),
    });
    return false;
  }
}

/**
 * Wait for element to be ready for interaction
 */
export async function waitForInteractive(
  element: HTMLElement,
  timeout = 2000
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (
      element.offsetParent !== null &&
      !element.hasAttribute('disabled') &&
      !element.hasAttribute('readonly')
    ) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  logger.warn('react-sync:wait-interactive', 'Element not ready', { timeout });
  return false;
}
