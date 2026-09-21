export type UserRole = 'producer' | 'operator' | 'advisor';

export type PlotStatus = 'optimal' | 'dry' | 'wet' | 'stale';

export interface GeoPolygon {
  type: 'Polygon';
  coordinates: [number, number][][]; // [lng, lat] GeoJSON standard
}

export interface Organization {
  id: string;
  name: string;
  region: string;
  created_at: string;
}

export interface Membership {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  created_at: string;
}

export interface Plot {
  id: string;
  organization_id: string;
  name: string;
  crop?: string;
  geom: GeoPolygon;
  threshold_min: number;
  threshold_max: number;
  created_at: string;
  // Campos derivados / vista
  status?: PlotStatus;
  latest_reading?: Reading;
}

export interface Station {
  id: string;
  plot_id: string;
  name: string;
  lat: number;
  lng: number;
  created_at: string;
}

export interface Reading {
  id: string;
  station_id: string;
  measured_at: string;
  moisture_pct: number;
  temp_c: number;
  rain_mm: number;
  source: 'sensor' | 'manual';
  created_at: string;
}

export interface Valve {
  id: string;
  plot_id: string;
  name: string;
  status: 'open' | 'closed';
  updated_at: string;
}

export interface IrrigationCommand {
  id: string;
  valve_id: string;
  requested_by: string;
  action: 'open' | 'close' | 'open_duration';
  duration_min?: number;
  status: 'pending' | 'applied' | 'failed' | 'cancelled';
  client_request_id: string;
  created_at: string;
  applied_at?: string;
  failure_reason?: string;
}

export interface AlertItem {
  id: string;
  plot_id: string;
  type: 'low_moisture' | 'stale_station' | 'command_failed';
  payload: Record<string, unknown>;
  created_at: string;
  read_at?: string;
}

// Estado del lote según niveles de humedad
export function calculatePlotStatus(
  moisturePct: number | null | undefined,
  measuredAt: string | null | undefined,
  thresholdMin: number = 25,
  thresholdMax: number = 45
): PlotStatus {
  if (moisturePct === null || moisturePct === undefined || !measuredAt) {
    return 'stale';
  }

  const ageMinutes = (Date.now() - new Date(measuredAt).getTime()) / (1000 * 60);
  if (ageMinutes > 15) {
    return 'stale';
  }

  if (moisturePct < thresholdMin) {
    return 'dry';
  }

  if (moisturePct <= thresholdMax) {
    return 'optimal';
  }

  return 'wet';
}

export const STATUS_COLORS: Record<PlotStatus, { fill: string; stroke: string; label: string; badgeBg: string }> = {
  optimal: {
    fill: 'rgba(34, 197, 94, 0.40)', // Verde
    stroke: '#16A34A',
    label: 'Óptimo',
    badgeBg: '#DCFCE7',
  },
  dry: {
    fill: 'rgba(239, 68, 68, 0.45)', // Rojo
    stroke: '#DC2626',
    label: 'Seco (Riego Requerido)',
    badgeBg: '#FEE2E2',
  },
  wet: {
    fill: 'rgba(59, 130, 246, 0.40)', // Azul
    stroke: '#2563EB',
    label: 'Húmedo',
    badgeBg: '#DBEAFE',
  },
  stale: {
    fill: 'rgba(156, 163, 175, 0.35)', // Gris
    stroke: '#6B7280',
    label: 'Sin señal (>15m)',
    badgeBg: '#F3F4F6',
  },
};
