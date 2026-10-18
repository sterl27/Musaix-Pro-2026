import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Studio from '../studio/page';
import Canvas from '../canvas/page';
vi.mock('@/lib/musaix/canvas-db', () => ({ listReferences: async () => [], loadLatestProject: async () => null }));
describe('existing routes', () => {
 it('renders the Studio cockpit', () => { render(<Studio />); expect(screen.getByRole('heading', {name:'Musaix Pro'})).toBeInTheDocument(); });
 it('renders Canvas', () => { render(<Canvas />); expect(screen.getByRole('heading', {name:'Canvas'})).toBeInTheDocument(); });
});
