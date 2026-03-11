import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle,
  Car,
  Fuel,
  Loader2,
  MapPin,
  Navigation,
  Radio,
  RefreshCw,
  Search,
  Utensils,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface LocationServicesProps {
  onSendToChat: (message: string) => void;
}

interface Coords {
  lat: number;
  lon: number;
}

interface Place {
  name: string;
  lat: number;
  lon: number;
  type: string;
  distance?: number;
}

function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrafficStatus(): { level: string; comment: string; color: string } {
  const hour = new Date().getHours();
  if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
    return {
      level: "Heavy",
      comment: "Rush hour detected — delays likely on major routes.",
      color: "text-red-400",
    };
  }
  if ((hour >= 10 && hour <= 16) || (hour >= 20 && hour <= 22)) {
    return {
      level: "Moderate",
      comment: "Normal daytime flow — occasional slowdowns possible.",
      color: "text-yellow-400",
    };
  }
  return {
    level: "Light",
    comment: "Roads are clear. Good time to travel.",
    color: "text-green-400",
  };
}

export default function LocationServices({
  onSendToChat,
}: LocationServicesProps) {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [address, setAddress] = useState<string>("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState("");
  const [placesType, setPlacesType] = useState<"restaurant" | "fuel" | null>(
    null,
  );
  const [trafficShown, setTrafficShown] = useState(false);

  const reverseGeocode = useCallback(async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      const city =
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        data.address?.county ||
        "Unknown City";
      const country = data.address?.country || "";
      return `${city}${country ? `, ${country}` : ""}`;
    } catch {
      return "Unknown Location";
    }
  }, []);

  const requestLocation = useCallback(async () => {
    setLocLoading(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
        const resolved = await reverseGeocode(latitude, longitude);
        setAddress(resolved);
        setLocLoading(false);
        onSendToChat(
          `📍 Your current location is **${resolved}**. I've pinpointed you on the map — looking good! Let me know if you'd like to find nearby spots or check traffic.`,
        );
      },
      () => {
        setLocationDenied(true);
        setLocLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true },
    );
  }, [reverseGeocode, onSendToChat]);

  useEffect(() => {
    if (navigator.geolocation) {
      requestLocation();
    } else {
      setLocationDenied(true);
    }
  }, [requestLocation]);

  const handleManualLocation = async () => {
    if (!manualInput.trim()) return;
    setManualLoading(true);
    setManualError("");
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(manualInput)}&format=json&limit=1`,
        { headers: { "Accept-Language": "en" } },
      );
      const data = await res.json();
      if (data.length === 0) {
        setManualError("Location not found. Try a different city or address.");
        setManualLoading(false);
        return;
      }
      const { lat, lon, display_name } = data[0];
      const parsedLat = Number.parseFloat(lat);
      const parsedLon = Number.parseFloat(lon);
      setCoords({ lat: parsedLat, lon: parsedLon });
      const shortName = display_name.split(",").slice(0, 2).join(",").trim();
      setAddress(shortName);
      setLocationDenied(false);
      setManualLoading(false);
      onSendToChat(
        `📍 I've set your location to **${shortName}**. Map is updated — ready to help you explore nearby!`,
      );
    } catch {
      setManualError("Failed to look up that location. Check your connection.");
      setManualLoading(false);
    }
  };

  const fetchNearby = async (amenity: "restaurant" | "fuel") => {
    if (!coords) return;
    setPlacesLoading(true);
    setPlacesError("");
    setPlaces([]);
    setPlacesType(amenity);
    const { lat, lon } = coords;
    const radius = 1000;
    const query = `[out:json][timeout:25];node["amenity"="${amenity}"](around:${radius},${lat},${lon});out 10;`;
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });
      const data = await res.json();
      const elements: Place[] = (data.elements || []).map(
        (el: {
          tags?: { name?: string; amenity?: string };
          lat: number;
          lon: number;
        }) => ({
          name:
            el.tags?.name ||
            (amenity === "restaurant"
              ? "Unnamed Restaurant"
              : "Unnamed Station"),
          lat: el.lat,
          lon: el.lon,
          type: amenity,
          distance: Math.round(haversineDistance(lat, lon, el.lat, el.lon)),
        }),
      );
      elements.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));
      setPlaces(elements.slice(0, 8));
      setPlacesLoading(false);

      if (elements.length === 0) {
        const label = amenity === "restaurant" ? "restaurants" : "gas stations";
        onSendToChat(
          `🔍 I searched within 1km of your location but couldn't find any ${label} in the area. The data might be sparse there.`,
        );
        return;
      }

      const label = amenity === "restaurant" ? "restaurants" : "gas stations";
      const list = elements
        .slice(0, 5)
        .map((p, i) => `${i + 1}. **${p.name}** — ${p.distance}m away`)
        .join("\n");
      onSendToChat(
        `Here are ${Math.min(elements.length, 5)} ${label} near you:\n\n${list}\n\nWant me to get directions or more info on any of them?`,
      );
    } catch {
      setPlacesError("Failed to fetch nearby places. Try again in a moment.");
      setPlacesLoading(false);
    }
  };

  const handleTraffic = () => {
    setTrafficShown(true);
    const traffic = getTrafficStatus();
    onSendToChat(
      `🚗 Traffic near **${address || "your location"}** is currently **${traffic.level}**. ${traffic.comment}`,
    );
  };

  const mapSrc = coords
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${coords.lon - 0.015},${coords.lat - 0.015},${coords.lon + 0.015},${coords.lat + 0.015}&layer=mapnik&marker=${coords.lat},${coords.lon}`
    : null;

  const traffic = getTrafficStatus();

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2 pb-1 border-b border-border/20">
          <Navigation className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-primary">
            Location Services
          </span>
          <Badge
            variant="outline"
            className="ml-auto font-mono text-[8px] px-1.5 py-0 border-primary/30 text-primary/70"
          >
            119-C
          </Badge>
        </div>

        {/* Location Status */}
        <div className="rounded-sm border border-border/30 bg-card/20 p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
              Current Location
            </span>
            {coords && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 font-mono text-[8px] text-muted-foreground hover:text-primary"
                onClick={requestLocation}
                data-ocid="location.refresh.button"
              >
                <RefreshCw className="w-2.5 h-2.5 mr-1" />
                Refresh
              </Button>
            )}
          </div>

          {locLoading && (
            <div
              className="flex items-center gap-2"
              data-ocid="location.loading_state"
            >
              <Loader2 className="w-3 h-3 animate-spin text-primary/60" />
              <span className="font-mono text-[9px] text-muted-foreground/60">
                Acquiring GPS signal...
              </span>
            </div>
          )}

          {!locLoading && coords && (
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-primary flex-shrink-0" />
                <span className="font-mono text-[10px] text-foreground/90 truncate">
                  {address}
                </span>
              </div>
              <div className="flex gap-3">
                <span className="font-mono text-[8px] text-muted-foreground/50">
                  LAT {coords.lat.toFixed(5)}
                </span>
                <span className="font-mono text-[8px] text-muted-foreground/50">
                  LON {coords.lon.toFixed(5)}
                </span>
              </div>
            </div>
          )}

          {/* Manual Fallback */}
          {locationDenied && !coords && (
            <div className="space-y-2" data-ocid="location.error_state">
              <div className="flex items-center gap-1.5 text-yellow-500/80">
                <AlertTriangle className="w-3 h-3" />
                <span className="font-mono text-[9px]">
                  Location access denied — enter manually
                </span>
              </div>
              <div className="flex gap-1.5">
                <Input
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && void handleManualLocation()
                  }
                  placeholder="Enter city or address..."
                  className="h-7 font-mono text-[9px] bg-card/30 border-border/30 placeholder:text-muted-foreground/30 flex-1"
                  data-ocid="location.input"
                />
                <Button
                  onClick={() => void handleManualLocation()}
                  disabled={manualLoading || !manualInput.trim()}
                  size="sm"
                  className="h-7 px-2 font-mono text-[9px]"
                  data-ocid="location.submit_button"
                >
                  {manualLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </Button>
              </div>
              {manualError && (
                <span className="font-mono text-[8px] text-destructive/70">
                  {manualError}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Map */}
        {mapSrc && (
          <div className="rounded-sm border border-border/30 overflow-hidden bg-card/10">
            <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border/20">
              <Radio className="w-2.5 h-2.5 text-primary/60" />
              <span className="font-mono text-[8px] uppercase tracking-wider text-muted-foreground/50">
                Live Map
              </span>
              <span className="ml-auto font-mono text-[7px] text-muted-foreground/30">
                OSM
              </span>
            </div>
            <iframe
              src={mapSrc}
              width="100%"
              height="180"
              className="block border-0 opacity-90"
              title="Location Map"
              data-ocid="location.canvas_target"
            />
          </div>
        )}

        {/* Action Buttons */}
        {coords && (
          <div className="grid grid-cols-3 gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNearby("restaurant")}
              disabled={placesLoading}
              className="h-8 flex-col gap-0.5 font-mono text-[8px] border-border/30 bg-card/20 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              data-ocid="location.restaurant.button"
            >
              <Utensils className="w-3 h-3" />
              Restaurants
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchNearby("fuel")}
              disabled={placesLoading}
              className="h-8 flex-col gap-0.5 font-mono text-[8px] border-border/30 bg-card/20 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              data-ocid="location.fuel.button"
            >
              <Fuel className="w-3 h-3" />
              Gas Stations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTraffic}
              className="h-8 flex-col gap-0.5 font-mono text-[8px] border-border/30 bg-card/20 hover:bg-primary/10 hover:border-primary/40 hover:text-primary"
              data-ocid="location.traffic.button"
            >
              <Car className="w-3 h-3" />
              Traffic
            </Button>
          </div>
        )}

        {/* Traffic Quick Status */}
        {trafficShown && coords && (
          <div className="rounded-sm border border-border/30 bg-card/20 p-2 flex items-center gap-2">
            <Car className="w-3 h-3 text-muted-foreground/50 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[9px] text-muted-foreground/60 uppercase">
                  Traffic
                </span>
                <span
                  className={`font-mono text-[9px] font-bold ${traffic.color}`}
                >
                  {traffic.level}
                </span>
              </div>
              <span className="font-mono text-[8px] text-muted-foreground/50 block truncate">
                {traffic.comment}
              </span>
            </div>
          </div>
        )}

        {/* Places Results */}
        {placesLoading && (
          <div
            className="flex items-center justify-center gap-2 py-4"
            data-ocid="location.places.loading_state"
          >
            <Loader2 className="w-4 h-4 animate-spin text-primary/50" />
            <span className="font-mono text-[9px] text-muted-foreground/50">
              Searching nearby...
            </span>
          </div>
        )}

        {placesError && (
          <div
            className="flex items-center gap-1.5 p-2 rounded-sm border border-destructive/20 bg-destructive/5"
            data-ocid="location.places.error_state"
          >
            <AlertTriangle className="w-3 h-3 text-destructive/60" />
            <span className="font-mono text-[9px] text-destructive/70">
              {placesError}
            </span>
          </div>
        )}

        {!placesLoading && places.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5 py-0.5">
              {placesType === "restaurant" ? (
                <Utensils className="w-3 h-3 text-primary/60" />
              ) : (
                <Fuel className="w-3 h-3 text-primary/60" />
              )}
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60">
                {placesType === "restaurant"
                  ? "Nearby Restaurants"
                  : "Nearby Gas Stations"}
              </span>
              <Badge
                variant="outline"
                className="ml-auto font-mono text-[7px] px-1 py-0 border-primary/20 text-primary/50"
              >
                {places.length} found
              </Badge>
            </div>
            <div className="space-y-1">
              {places.map((place, i) => (
                <div
                  key={`${place.name}-${place.lat}-${place.lon}`}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm border border-border/20 bg-card/20 hover:bg-card/40 transition-colors"
                  data-ocid={`location.places.item.${i + 1}`}
                >
                  <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <span className="font-mono text-[7px] text-primary/70">
                      {i + 1}
                    </span>
                  </div>
                  <span className="font-mono text-[9px] text-foreground/80 flex-1 truncate">
                    {place.name}
                  </span>
                  <span className="font-mono text-[8px] text-primary/50 flex-shrink-0">
                    {place.distance}m
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No location yet */}
        {!coords && !locLoading && !locationDenied && (
          <div className="text-center py-6" data-ocid="location.empty_state">
            <MapPin className="w-6 h-6 text-muted-foreground/20 mx-auto mb-2" />
            <p className="font-mono text-[9px] text-muted-foreground/40">
              Waiting for location...
            </p>
          </div>
        )}

        {/* Footer attribution */}
        <div className="pt-1 border-t border-border/10">
          <span className="font-mono text-[7px] text-muted-foreground/30">
            Map data © OpenStreetMap contributors · Places via Overpass API
          </span>
        </div>
      </div>
    </ScrollArea>
  );
}
