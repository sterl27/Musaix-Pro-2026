import type { PromptSet, ReferenceCard } from './types';

export function exportPromptMarkdown(reference: ReferenceCard | null, prompt: PromptSet) {
  const referenceTitle = reference?.title ?? 'Untitled Reference';
  const referenceText = reference?.sourceText ?? '';

  return `# Musaix Prompt

## Reference

${referenceTitle}

${referenceText}

## Style Prompt

${prompt.style_prompt}

## Structure Prompt

${prompt.structure_prompt}

## Vocal Direction

${prompt.vocal_direction}

## Production Notes

${prompt.production_notes}

## Negative Prompt

${prompt.negative_prompt}
`;
}
