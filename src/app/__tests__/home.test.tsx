import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '../page';

describe('home', () => {
  it('opens on the suite thesis and the four live rooms', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'AI is the instrument, never the hand.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Enter Studio' })).toHaveAttribute('href', '/studio');
    expect(screen.getByRole('link', { name: 'Open Audio' })).toHaveAttribute('href', '/audio');

    for (const room of ['Studio', 'Audio', 'Canvas', 'Research']) {
      expect(screen.getByRole('link', { name: new RegExp(`^${room}\\b`) })).toHaveAttribute('href', `/${room.toLowerCase()}`);
    }
  });
});
