/**
 * EarthMap — God's eye view of the Nodeverse land system
 *
 * Leaflet + OpenStreetMap tiles (free, no API key, no vendor lock-in).
 * Zoom from space → continent → country → city → street level.
 * Parcel data overlaid as markers. Landmarks as gold pins.
 *
 * Tile layers:
 *   - Default: OpenStreetMap (streets, labels)
 *   - Satellite: ESRI World Imagery (aerial/satellite photos)
 *   - Topo: OpenTopoMap (terrain + elevation)
 *
 * Frank's vision: "the digital earth for all agents. every agent needs
 * a planet and soundchain is delivering that."
 */
import { useEffect, useState, useCallback } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { FAMOUS_LANDMARKS, lngLatToParcel } from 'lib/nodeverse/landmarks'

// Fix Leaflet default icon paths (broken by webpack)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Gold landmark icon
const landmarkIcon = new L.DivIcon({
  className: 'landmark-pin',
  html: `<div style="width:28px;height:28px;border-radius:50%;background:#facc15;border:3px solid #000;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 0 12px rgba(250,204,21,0.6);">🏛️</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

// Owned parcel icon
const parcelIcon = new L.DivIcon({
  className: 'parcel-pin',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#22d3ee;border:2px solid #fff;box-shadow:0 0 8px rgba(34,211,238,0.5);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Search result pin
const searchIcon = new L.DivIcon({
  className: 'search-pin',
  html: `<div style="width:24px;height:24px;border-radius:50%;background:#ef4444;border:3px solid #fff;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 0 12px rgba(239,68,68,0.6);animation:pulse 1.5s infinite;">✈</div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

interface OwnedSquare {
  x: number
  z: number
  ownerHandle?: string
  ownerColor?: string
  price?: number
  tier?: string
}

interface EarthMapProps {
  ownedSquares: OwnedSquare[]
  searchResult: { name: string; lat: number; lng: number } | null
  onClaimParcel: (x: number, z: number, lat: number, lng: number) => void
}

// Sub-component to fly to search result
function FlyToSearch({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 2 })
  }, [lat, lng, map])
  return null
}

export default function EarthMap({ ownedSquares, searchResult, onClaimParcel }: EarthMapProps) {
  const [mapReady, setMapReady] = useState(false)

  return (
    <div className="w-full h-full relative" style={{ minHeight: '500px' }}>
      <MapContainer
        center={[20, 0]}
        zoom={3}
        style={{ width: '100%', height: '100%', minHeight: '500px', background: '#0a1530' }}
        zoomControl={true}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        boxZoom={true}
        tap={true}
        whenReady={() => setMapReady(true)}
      >
        <LayersControl position="topright">
          {/* Street map (default) */}
          <LayersControl.BaseLayer checked name="Streets">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          {/* Satellite imagery (ESRI — free, no API key) */}
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>

          {/* Dark mode */}
          <LayersControl.BaseLayer name="Dark">
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>

          {/* Topographic */}
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='Map data: &copy; OpenStreetMap, SRTM | Map style: &copy; OpenTopoMap'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Famous landmarks — Tier S premium pins */}
        {FAMOUS_LANDMARKS.map(lm => (
          <Marker key={lm.name} position={[lm.lat, lm.lng]} icon={landmarkIcon}>
            <Popup>
              <div style={{ fontFamily: 'monospace', minWidth: '200px' }}>
                <div style={{ fontSize: '18px', marginBottom: '4px' }}>{lm.emoji} <strong>{lm.name}</strong></div>
                <div style={{ color: '#666', fontSize: '11px' }}>{lm.city}, {lm.country}</div>
                <div style={{ color: '#666', fontSize: '10px' }}>{lm.lat.toFixed(4)}°, {lm.lng.toFixed(4)}°</div>
                <div style={{ marginTop: '8px', padding: '4px 8px', background: '#facc15', color: '#000', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', textAlign: 'center' }}>
                  🏛️ TIER S · 5000 OGUN
                </div>
                <button
                  onClick={() => {
                    const { x, z } = lngLatToParcel(lm.lng, lm.lat)
                    onClaimParcel(x, z, lm.lat, lm.lng)
                  }}
                  style={{ marginTop: '6px', width: '100%', padding: '6px', background: '#1a1a2e', color: '#facc15', border: '1px solid #facc15', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  🚀 COMING SOON
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Owned parcels */}
        {ownedSquares.map(sq => {
          const lat = -(sq.z / 250) * 85
          const lng = (sq.x / 250) * 180
          return (
            <Marker key={`${sq.x},${sq.z}`} position={[lat, lng]} icon={parcelIcon}>
              <Popup>
                <div style={{ fontFamily: 'monospace' }}>
                  <div><strong>Parcel ({sq.x}, {sq.z})</strong></div>
                  <div style={{ color: '#22d3ee' }}>@{sq.ownerHandle}</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{sq.tier?.toUpperCase()} · {sq.price} OGUN</div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Search result pin */}
        {searchResult && (
          <>
            <FlyToSearch lat={searchResult.lat} lng={searchResult.lng} />
            <Marker position={[searchResult.lat, searchResult.lng]} icon={searchIcon}>
              <Popup>
                <div style={{ fontFamily: 'monospace' }}>
                  <div>✈ <strong>{searchResult.name.split(',')[0]}</strong></div>
                  <div style={{ fontSize: '10px', color: '#666' }}>{searchResult.lat.toFixed(4)}°, {searchResult.lng.toFixed(4)}°</div>
                  <div style={{ fontSize: '10px', color: '#666' }}>
                    Parcel: ({lngLatToParcel(searchResult.lng, searchResult.lat).x}, {lngLatToParcel(searchResult.lng, searchResult.lat).z})
                  </div>
                  <button
                    onClick={() => {
                      const { x, z } = lngLatToParcel(searchResult.lng, searchResult.lat)
                      onClaimParcel(x, z, searchResult.lat, searchResult.lng)
                    }}
                    style={{ marginTop: '6px', width: '100%', padding: '6px', background: '#1a1a2e', color: '#22d3ee', border: '1px solid #22d3ee', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    🚀 COMING SOON
                  </button>
                </div>
              </Popup>
            </Marker>
          </>
        )}
      </MapContainer>

      {/* Custom CSS for animations */}
      <style jsx global>{`
        .landmark-pin, .parcel-pin, .search-pin { background: transparent !important; border: none !important; }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.3); } }
        .leaflet-container { font-family: monospace; }
        .leaflet-popup-content-wrapper { background: #0a0f1f; color: #fff; border: 1px solid #22d3ee33; }
        .leaflet-popup-tip { background: #0a0f1f; }
        .leaflet-control-layers { background: #0a0f1f !important; color: #fff !important; border: 1px solid #22d3ee33 !important; }
        .leaflet-control-layers label { color: #ccc !important; }
        .leaflet-control-zoom a { background: #0a0f1f !important; color: #22d3ee !important; border-color: #22d3ee33 !important; }
      `}</style>
    </div>
  )
}
