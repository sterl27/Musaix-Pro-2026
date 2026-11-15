import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Cockpit from '../cockpit/page';
import Investors from '../investors/page';
import { LandingPage } from '@/components/gateway/landing';

describe('gateway pages', () => {
  it('sells the suite and points at early access', () => {
    render(<LandingPage />);
    expect(screen.getByRole('heading', { name: /AI is the instrument/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Record\. Then edit\. Then create/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /The brief comes first/i })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Get early access' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: 'Get early access' })[0]).toHaveAttribute('href', '/sign-up?next=/brief');
    expect(screen.getByRole('link', { name: 'Start your brief' })).toHaveAttribute('href', '/sign-up?next=/brief');
    expect(screen.getByRole('link', { name: 'The loop' })).toHaveAttribute('href', '/investors#loop');
    expect(screen.queryByText(/audioweaver cockpit is live/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trusted by|testimonial|as seen in/i)).not.toBeInTheDocument();
  });

  it('serves the investor landing from /investors', () => {
    render(<Investors />);
    expect(screen.getByRole('heading', { name: /The brief comes first/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The loop' })).toHaveAttribute('href', '/investors#loop');
    expect(screen.queryByRole('link', { name: 'Enter Studio' })).not.toBeInTheDocument();
  });

  it('keeps the cockpit status card on its own route', () => {
    render(<Cockpit />);
    expect(screen.getByRole('heading', { name: /Audioweaver cockpit is live/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to Musaix Pro' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Open Audio' })).toHaveAttribute('href', '/audio');
  });
});
