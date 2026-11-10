/**
 * A new project made from an Inbox todo (docs/dev/history/technical-design-calmer-screens.md
 * §3.7): the name it starts with - the todo's words without its tags and
 * without a leading "Idea:" / "Idee:" - and what happens to the todo. The
 * form only prefills; nothing is created without a tap. Pure.
 */
import {stripTagsFromText} from './markdown';

export type NewProjectTodo = 'next' | 'todo' | 'remove';

/** The project name a todo's text suggests. */
export function projectNameFromItem(text: string): string {
  const words = stripTagsFromText(text).replace(/\s+/g, ' ').trim();
  return words.replace(/^(idea|idee)\s*:\s*/i, '').trim();
}
