import { act, waitFor } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { SortableList } from './drag-drop';
import { KanbanBoard } from './kanban';

const items = [{id: 'one', title: 'Brief'}, {id: 'two', title: 'Review'}];
const list = <SortableList label="Order" items={items} getItemLabel={item => item.title} onItemsChange={() => {}} renderItem={item => item.title} />;
const board = <KanbanBoard label="Board" columns={[{id: 'todo', title: 'To do', items}, {id: 'done', title: 'Done', items: []}]} getItemLabel={item => item.title} onColumnsChange={() => {}} renderCard={item => item.title} />;

it('preserves drag instruction references across SSR and hydration in independent roots', async () => {
  const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
  const roots: ReturnType<typeof hydrateRoot>[] = [];
  const containers: HTMLElement[] = [];
  try {
    for (const [index, element] of [list, board].entries()) {
      const prefix = `island-${index}-`;
      const container = document.createElement('section');
      container.innerHTML = renderToString(element, {identifierPrefix: prefix});
      document.body.append(container);
      containers.push(container);
      // A different server render consumes the library counter before this root hydrates.
      renderToString(list);
      await act(async () => { roots.push(hydrateRoot(container, element, {identifierPrefix: prefix})); });
      await waitFor(() => {
        const handles = container.querySelectorAll('[data-drag-handle]');
        expect(handles.length).toBe(2);
        for (const handle of handles) {
          const references = handle.getAttribute('aria-describedby')?.split(/\s+/) ?? [];
          expect(references.length).toBeGreaterThan(0);
          for (const id of references) expect(document.getElementById(id)).not.toBeNull();
        }
      });
    }
    expect(errors.mock.calls.flat().some(value => /hydration|hydrated but|didn't match/i.test(String(value)))).toBe(false);
  } finally {
    await act(async () => { roots.forEach(root => root.unmount()); });
    containers.forEach(container => container.remove());
    errors.mockRestore();
  }
});
