import React from 'react';
import { useParams } from 'react-router-dom';
import ARMarkerViewer from '@/components/ar_logic/ARMarkerViewer'; // if local, adjust if moved

export default function ARView() {
  const { anchorId } = useParams();

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden' }}>
      <ARMarkerViewer anchorId={anchorId} />
    </div>
  );
}
