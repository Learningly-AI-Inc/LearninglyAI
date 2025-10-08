import { Mark, mergeAttributes } from '@tiptap/core';

export interface GrammarHighlightOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    grammarHighlight: {
      /**
       * Set a grammar highlight mark
       */
      setGrammarHighlight: (attributes?: { id: string; type: string }) => ReturnType;
      /**
       * Toggle a grammar highlight mark
       */
      toggleGrammarHighlight: (attributes?: { id: string; type: string }) => ReturnType;
      /**
       * Unset a grammar highlight mark
       */
      unsetGrammarHighlight: () => ReturnType;
      /**
       * Remove a specific grammar highlight by ID
       */
      removeGrammarHighlight: (id: string) => ReturnType;
      /**
       * Clear all grammar highlights
       */
      clearGrammarHighlights: () => ReturnType;
    };
  }
}

export const GrammarHighlight = Mark.create<GrammarHighlightOptions>({
  name: 'grammarHighlight',

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-grammar-id'),
        renderHTML: attributes => {
          if (!attributes.id) {
            return {};
          }
          return {
            'data-grammar-id': attributes.id,
          };
        },
      },
      type: {
        default: 'grammar',
        parseHTML: element => element.getAttribute('data-grammar-type'),
        renderHTML: attributes => {
          if (!attributes.type) {
            return {};
          }
          return {
            'data-grammar-type': attributes.type,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-grammar-id]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'grammar-highlight',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setGrammarHighlight:
        attributes =>
        ({ commands }) => {
          return commands.setMark(this.name, attributes);
        },
      toggleGrammarHighlight:
        attributes =>
        ({ commands }) => {
          return commands.toggleMark(this.name, attributes);
        },
      unsetGrammarHighlight:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
      removeGrammarHighlight:
        id =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          const { doc } = state;
          const newTr = tr;

          doc.descendants((node, pos) => {
            node.marks.forEach(mark => {
              if (mark.type.name === this.name && mark.attrs.id === id) {
                newTr.removeMark(
                  pos,
                  pos + node.nodeSize,
                  mark.type
                );
              }
            });
          });

          dispatch(newTr);
          return true;
        },
      clearGrammarHighlights:
        () =>
        ({ tr, state, dispatch }) => {
          if (!dispatch) return false;

          const { doc } = state;
          const newTr = tr;

          doc.descendants((node, pos) => {
            node.marks.forEach(mark => {
              if (mark.type.name === this.name) {
                newTr.removeMark(
                  pos,
                  pos + node.nodeSize,
                  mark.type
                );
              }
            });
          });

          dispatch(newTr);
          return true;
        },
    };
  },
});
