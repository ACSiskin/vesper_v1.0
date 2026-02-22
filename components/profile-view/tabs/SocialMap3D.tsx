import React, { useState, useMemo } from 'react';
import DeckGL from '@deck.gl/react';
import { IconLayer, ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { Map } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { GeoEvent } from '@/core/scraper-engine/utils';

// Widok początkowy: Europa Centralna
const INITIAL_VIEW_STATE = {
  longitude: 19.1451,
  latitude: 51.9194,
  zoom: 4,
  pitch: 45,
  bearing: 0
};

interface SocialMapProps {
  events: GeoEvent[];
  onEventClick: (url: string) => void;
  theme?: 'dark' | 'light';
}

export const SocialMap3D: React.FC<SocialMapProps> = ({ events, onEventClick, theme = 'dark' }) => {
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [hoverInfo, setHoverInfo] = useState<any>(null);

  // Filtrujemy tylko te zdarzenia, które mają twarde dowody (zdjęcia)
  const evidencePoints = useMemo(() => {
    if (!events) return [];
    return events.filter(e => e.type === 'photo_evidence');
  }, [events]);
  
  // Generowanie łuków (podróży) między chronologicznymi punktami
  const arcsData = useMemo(() => {
    const arcs = [];
    const sorted = [...evidencePoints].sort((a, b) => a.timestamp - b.timestamp);
    
    for (let i = 0; i < sorted.length - 1; i++) {
      const source = sorted[i];
      const target = sorted[i + 1];
      
      // Rysujemy linię tylko przy znaczącej zmianie lokalizacji
      if (Math.abs(source.lat - target.lat) > 0.001 || Math.abs(source.lng - target.lng) > 0.001) {
        arcs.push({
          source: [source.lng, source.lat],
          target: [target.lng, target.lat],
          sourceTime: source.dateStr,
          targetTime: target.dateStr
        });
      }
    }
    return arcs;
  }, [evidencePoints]);

  const layers = [
    // Warstwa 1: Łuki podróży
    new ArcLayer({
      id: 'travel-arcs',
      data: arcsData,
      getSourcePosition: (d: any) => d.source,
      getTargetPosition: (d: any) => d.target,
      getSourceColor: [0, 255, 128], // Neon Green
      getTargetColor: [255, 0, 128], // Neon Pink
      getWidth: 3,
      tilt: 20, 
    }),

    // Warstwa 2: Pulsujące punkty (Obszar)
    new ScatterplotLayer({
      id: 'location-pulse',
      data: evidencePoints,
      getPosition: (d: GeoEvent) => [d.lng, d.lat],
      getFillColor: [0, 255, 0],
      getRadius: 15000, 
      radiusMinPixels: 5,
      radiusMaxPixels: 30,
      opacity: 0.2,
      stroked: true,
      getLineColor: [0, 255, 0],
      getLineWidth: 2,
    }),

    // Warstwa 3: Markery
    new IconLayer({
      id: 'photo-markers',
      data: evidencePoints,
      getPosition: (d: GeoEvent) => [d.lng, d.lat],
      getIcon: () => ({
        url: 'https://raw.githubusercontent.com/visgl/deck.gl-data/master/website/icon-atlas.png',
        width: 128,
        height: 128,
        anchorY: 128,
        mask: true
      }),
      getColor: [255, 255, 255],
      getSize: 40,
      pickable: true,
      onHover: info => setHoverInfo(info),
      onClick: info => info.object && onEventClick(info.object.thumbnailUrl)
    })
  ];

  if (!events || events.length === 0) {
      return (
          <div className="flex items-center justify-center h-full text-gray-500 font-mono text-xs border border-gray-800 rounded bg-black">
              NO GEO_INTEL DATA AVAILABLE
          </div>
      )
  }

  return (
    <div className="relative w-full h-[600px] bg-black rounded-lg overflow-hidden border border-gray-800 shadow-2xl">
      <DeckGL
        initialViewState={viewState}
        controller={true}
        layers={layers}
        getTooltip={({ object }) => object && {
            html: `
                <div style="background: rgba(0,0,0,0.9); color: #0f0; padding: 12px; border: 1px solid #0f0; font-family: monospace; font-size: 11px;">
                    <div style="font-weight: bold; border-bottom: 1px solid #333; margin-bottom: 5px;">
                        ${object.locationName}
                    </div>
                    <div style="color: #fff;">${object.dateStr}</div>
                    <div style="font-size: 9px; color: #aaa; margin-top:5px;">KLIKNIJ ABY ZOBACZYĆ DOWÓD</div>
                </div>
            `,
            style: { color: '#fff' }
        }}
      >
        <Map
            mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        />
      </DeckGL>
      
      {/* HUD */}
      <div className="absolute top-4 right-4 pointer-events-none select-none">
          <div className="bg-black/70 backdrop-blur border border-green-900 p-3 rounded text-[10px] font-mono text-green-500 shadow-lg">
              <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-bold">GEO_INTEL :: ONLINE</span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 text-gray-400">
                  <span>LOCATIONS:</span> <span className="text-white">{evidencePoints.length}</span>
                  <span>TRAVELS:</span> <span className="text-white">{arcsData.length}</span>
              </div>
          </div>
      </div>
    </div>
  );
};
