/**
 * Live drag and drop examples for /developers/drag-drop/. One module, one island per example:
 * <DragDropGallery name="table" client:visible /> hydrates only that example. Every example is
 * controlled local state; Save writes to this browser's localStorage and nothing is sent anywhere.
 */
import BlocksExample from "./BlocksExample";
import KanbanExample from "./KanbanExample";
import QueueExample from "./QueueExample";
import TableExample from "./TableExample";
import "./drag-drop.css";

const examples = { table: TableExample, kanban: KanbanExample, queue: QueueExample, blocks: BlocksExample } as const;
export type ExampleName = keyof typeof examples;

export default function DragDropGallery({ name }: { name: ExampleName }) {
  const Example = examples[name];
  return <Example />;
}
