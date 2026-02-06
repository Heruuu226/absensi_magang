
import React, { useEffect, useRef } from 'react';

interface MapViewProps {
  lat: number;
  lng: number;
  zoom?: number;
}

const MapView: React.FC<MapViewProps> = ({ lat, lng, zoom = 15 }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);

  useEffect(() => {
    if (mapRef.current && !mapInstance.current) {
      // @ts-ignore
      mapInstance.current = L.map(mapRef.current).setView([lat, lng], zoom);
      
      // @ts-ignore
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      // @ts-ignore
      L.marker([lat, lng]).addTo(mapInstance.current);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [lat, lng, zoom]);

  return <div ref={mapRef} className="w-full h-48 rounded-2xl border shadow-inner mt-2 z-0" />;
};

export default MapView;
