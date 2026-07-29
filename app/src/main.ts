/**
 * Application entry point. Wires the casting page to the reading view.
 * Persistence is opt-in: the reading view offers a "Save reading locally"
 * button; nothing is written to localStorage automatically.
 *
 * OWNER: Trinity.
 */

import type { Cast } from './types';
import { renderCastingPage } from './ui/castingPage';
import { renderReadingView } from './ui/readingView';

/**
 * Bootstraps the app into the `#app` element.
 */
export function main(): void {
  const container = document.getElementById('app');
  if (!container) {
    throw new Error('#app container not found');
  }
  boot(container);
}

function boot(container: HTMLElement): void {
  renderCastingPage(
    container,
    (cast: Cast, question?: string, alreadySaved?: boolean) => {
      renderReadingView(container, cast, {
        ...(question !== undefined ? { question } : {}),
        ...(alreadySaved !== undefined ? { alreadySaved } : {}),
        onRestart: () => boot(container),
      });
    }
  );
}

main();
