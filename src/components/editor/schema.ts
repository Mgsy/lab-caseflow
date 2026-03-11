import { Schema, MarkSpec } from 'prosemirror-model';
import { schema as basicSchema } from 'prosemirror-schema-basic';
import { addListNodes } from 'prosemirror-schema-list';
import { spreadsheetEmbed } from './nodes/spreadsheet-embed';
import { chartEmbed } from './nodes/chart-embed';
import { fileAttachment } from './nodes/file-attachment';
import { codeSnippet } from './nodes/code-snippet';

const underline: MarkSpec = {
  parseDOM: [
    { tag: 'u' },
    { style: 'text-decoration=underline' },
  ],
  toDOM() {
    return ['u', 0] as const;
  },
};

const strikethrough: MarkSpec = {
  parseDOM: [
    { tag: 's' },
    { tag: 'del' },
    { style: 'text-decoration=line-through' },
  ],
  toDOM() {
    return ['s', 0] as const;
  },
};

const fontSize: MarkSpec = {
  attrs: { size: {} },
  parseDOM: [{
    style: 'font-size',
    getAttrs: (value) => {
      if (typeof value !== 'string') return false;
      return { size: value };
    },
  }],
  toDOM(mark) {
    return ['span', { style: `font-size: ${mark.attrs.size}` }, 0];
  },
};

const fontColor: MarkSpec = {
  attrs: { color: {} },
  parseDOM: [{
    style: 'color',
    getAttrs: (value) => {
      if (typeof value !== 'string') return false;
      return { color: value };
    },
  }],
  toDOM(mark) {
    return ['span', { style: `color: ${mark.attrs.color}` }, 0];
  },
};

const nodes = addListNodes(basicSchema.spec.nodes, 'paragraph block*', 'block')
  .append({
    spreadsheet_embed: spreadsheetEmbed,
    chart_embed: chartEmbed,
    file_attachment: fileAttachment,
    code_snippet: codeSnippet,
  });

const marks = basicSchema.spec.marks
  .addToEnd('underline', underline)
  .addToEnd('strikethrough', strikethrough)
  .addToEnd('fontSize', fontSize)
  .addToEnd('fontColor', fontColor);

export const caseflowSchema = new Schema({
  nodes,
  marks,
});
