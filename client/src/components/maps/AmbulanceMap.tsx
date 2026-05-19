'use client';

import { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ambulanceApi } from '@/lib/api';

interface Location {
  lat: number;
  lng: number;
}

interface AmbulanceData {
  id: string;
  unitNumber: string;
  status: string;
  currentLat?: number;
  currentLng?: number;
  driverName?: string;
  estimatedArrival?: string;
}

interface HospitalData {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  availableBeds: number;
}

interface EmergencyLocation {
  lat: number;
  lng: number;
  address?: string;
}

interface AmbulanceMapProps {
  ambulance?: AmbulanceData;
  hospitals?: HospitalData[];
  emergencyLocation?: EmergencyLocation;
  ambulanceId?: string;
  height?: string;
  className?: string;
}

const ambulanceIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const hospitalIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const emergencyIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-yellow.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function FitBounds({ locations }: { locations: Location[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length > 0) {
      const bounds = L.latLngBounds(locations.map((l) => [l.lat, l.lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, locations]);
  return null;
}

export function AmbulanceMap({
  ambulance,
  hospitals = [],
  emergencyLocation,
  ambulanceId,
  height = '400px',
  className = '',
}: AmbulanceMapProps) {
  const [currentPosition, setCurrentPosition] = useState<Location | null>(
    ambulance?.currentLat && ambulance?.currentLng
      ? { lat: ambulance.currentLat, lng: ambulance.currentLng }
      : null
  );

  const locations: Location[] = [];
  if (currentPosition) locations.push(currentPosition);
  if (emergencyLocation) locations.push(emergencyLocation);
  hospitals.forEach((h) => {
    if (h.latitude && h.longitude) locations.push({ lat: h.latitude, lng: h.longitude });
  });

  const defaultCenter = locations.length > 0 ? locations[0] : { lat: 30.0444, lng: 31.2357 };

  return (
    <div className={`rounded-lg overflow-hidden border border-border ${className}`} style={{ height }}>
      <MapContainer
        center={[defaultCenter.lat, defaultCenter.lng]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.length > 0 && <FitBounds locations={locations} />}

        {currentPosition && (
          <Marker position={[currentPosition.lat, currentPosition.lng]} icon={ambulanceIcon}>
            <Popup>
              <div className="text-sm">
                <strong>{ambulance?.unitNumber || 'Ambulance'}</strong>
                <br />
                Status: {ambulance?.status}
                <br />
                Driver: {ambulance?.driverName || 'N/A'}
              </div>
            </Popup>
          </Marker>
        )}

        {hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            position={[hospital.latitude, hospital.longitude]}
            icon={hospitalIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>{hospital.name}</strong>
                <br />
                Available Beds: {hospital.availableBeds}
              </div>
            </Popup>
          </Marker>
        ))}

        {emergencyLocation && (
          <Marker
            position={[emergencyLocation.lat, emergencyLocation.lng]}
            icon={emergencyIcon}
          >
            <Popup>
              <div className="text-sm">
                <strong>Emergency Location</strong>
                <br />
                {emergencyLocation.address || 'Emergency site'}
              </div>
            </Popup>
          </Marker>
        )}

        {currentPosition && emergencyLocation && (
          <Polyline
            positions={[
              [currentPosition.lat, currentPosition.lng],
              [emergencyLocation.lat, emergencyLocation.lng],
            ]}
            color="#E63946"
            weight={2}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
}
