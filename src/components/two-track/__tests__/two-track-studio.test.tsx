import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TwoTrackStudio } from '@/components/two-track/two-track-studio';

describe('TwoTrackStudio', () => {
  it('renders without an AudioContext and keeps cloud behind a configuration check', () => {
    render(<TwoTrackStudio />);
    expect(screen.getByRole('heading', { name: '2-Track Recorder' })).toBeInTheDocument();
    expect(screen.getByTestId('play')).toHaveTextContent(/play/i);
    expect(screen.getByTestId('cloud')).toBeInTheDocument();
    expect(screen.queryByTestId('save-take')).not.toBeInTheDocument();
  });
  it('toggles sequencer steps', () => {
    render(<TwoTrackStudio />);
    const cell = screen.getByTestId('cell-clap-3');
    const before = cell.getAttribute('aria-pressed');
    fireEvent.click(cell);
    expect(cell.getAttribute('aria-pressed')).not.toBe(before);
  });
  it('switches to the audio beat drop zone', () => {
    render(<TwoTrackStudio />);
    fireEvent.click(screen.getByTestId('mode-audio'));
    expect(screen.getByTestId('drop')).toHaveTextContent(/drop an mp3/i);
  });
});
