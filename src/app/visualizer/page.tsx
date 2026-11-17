import type { Metadata } from 'next';
import { VisualizerStage } from '@/components/visualizer/visualizer-stage';

export const metadata: Metadata = {
  title: 'Visualizer',
  description: 'Watch microphone input or a local audio file as bars, rings, and waves. Playback stays in this browser.',
};

export default function VisualizerPage() {
  return <VisualizerStage />;
}
