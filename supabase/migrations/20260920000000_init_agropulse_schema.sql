-- ==============================================================================
-- AgroPulse — Esquema de Base de Datos y Políticas RLS
-- ==============================================================================

-- 1. Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Opcional: PostGIS para operaciones geoespaciales avanzadas si el entorno lo soporta
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS "postgis";
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'PostGIS no disponible en este entorno; se utilizará GeoJSON nativo en JSONB.';
END $$;

-- 2. Tabla: organizations (Establecimientos agropecuarios)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    region TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla: memberships (Roles por usuario y organización: producer, operator, advisor)
CREATE TABLE IF NOT EXISTS public.memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('producer', 'operator', 'advisor')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, organization_id)
);

-- 4. Tabla: plots (Lotes agrícolas con geometría de polígono y umbrales)
CREATE TABLE IF NOT EXISTS public.plots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    crop TEXT, -- Ej: 'Citrus', 'Soja', 'Maíz'
    geom JSONB NOT NULL, -- GeoJSON Polygon { "type": "Polygon", "coordinates": [...] }
    threshold_min NUMERIC NOT NULL DEFAULT 25,
    threshold_max NUMERIC NOT NULL DEFAULT 45,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla: stations (Estaciones de medición / sensores instalados en lote)
CREATE TABLE IF NOT EXISTS public.stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tabla: readings (Lecturas de humedad, temperatura y lluvia)
CREATE TABLE IF NOT EXISTS public.readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    moisture_pct NUMERIC NOT NULL,
    temp_c NUMERIC NOT NULL,
    rain_mm NUMERIC NOT NULL DEFAULT 0,
    source TEXT NOT NULL CHECK (source IN ('sensor', 'manual')) DEFAULT 'sensor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readings_station_measured 
ON public.readings (station_id, measured_at DESC);

-- 7. Tabla: valves (Válvulas / actuadores de riego por lote)
CREATE TABLE IF NOT EXISTS public.valves (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'closed',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Tabla: irrigation_commands (Órdenes asíncronas de riego con acuse e idempotencia)
CREATE TABLE IF NOT EXISTS public.irrigation_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    valve_id UUID NOT NULL REFERENCES public.valves(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES auth.users(id),
    action TEXT NOT NULL CHECK (action IN ('open', 'close', 'open_duration')),
    duration_min INTEGER CHECK (duration_min BETWEEN 1 AND 120),
    status TEXT NOT NULL CHECK (status IN ('pending', 'applied', 'failed', 'cancelled')) DEFAULT 'pending',
    client_request_id UUID NOT NULL UNIQUE, -- Clave de idempotencia para reintentos de red
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    applied_at TIMESTAMPTZ,
    failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_irrigation_commands_valve_status 
ON public.irrigation_commands (valve_id, status);

-- 9. Tabla: alerts (Alertas automáticas de humedad baja o sensor stale)
CREATE TABLE IF NOT EXISTS public.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plot_id UUID NOT NULL REFERENCES public.plots(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('low_moisture', 'stale_station', 'command_failed')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- ==============================================================================
-- 10. Vista de Estado de Lote (v_plots_status)
-- Semáforo:
--  stale   (gris)  : sin lectura reciente (> 15 min)
--  dry     (rojo)  : humedad < umbral mínimo
--  optimal (verde) : humedad dentro del rango óptimo
--  wet     (azul)  : humedad > umbral máximo
-- ==============================================================================
CREATE OR REPLACE VIEW public.v_plots_status AS
WITH latest_station_readings AS (
    SELECT DISTINCT ON (s.id)
        s.id AS station_id,
        s.plot_id,
        r.moisture_pct,
        r.temp_c,
        r.rain_mm,
        r.measured_at,
        EXTRACT(EPOCH FROM (now() - r.measured_at)) / 60.0 AS age_minutes
    FROM public.stations s
    LEFT JOIN public.readings r ON r.station_id = s.id
    ORDER BY s.id, r.measured_at DESC NULLS LAST
),
plot_aggregates AS (
    SELECT
        p.id AS plot_id,
        p.organization_id,
        p.name AS plot_name,
        p.crop,
        p.geom,
        p.threshold_min,
        p.threshold_max,
        lsr.station_id,
        lsr.moisture_pct,
        lsr.temp_c,
        lsr.rain_mm,
        lsr.measured_at AS last_reading_at,
        lsr.age_minutes,
        CASE
            WHEN lsr.moisture_pct IS NULL OR lsr.age_minutes > 15 THEN 'stale'
            WHEN lsr.moisture_pct < p.threshold_min THEN 'dry'
            WHEN lsr.moisture_pct <= p.threshold_max THEN 'optimal'
            ELSE 'wet'
        END AS status_color
    FROM public.plots p
    LEFT JOIN latest_station_readings lsr ON lsr.plot_id = p.id
)
SELECT * FROM plot_aggregates;

-- ==============================================================================
-- 11. Habilitación de Supabase Realtime para WebSockets
-- ==============================================================================
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.readings;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.valves;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.irrigation_commands;
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Configuración de publicación realtime omitida o ya existente.';
END $$;

-- ==============================================================================
-- 12. Políticas de Seguridad RLS (Row Level Security)
-- ==============================================================================

-- Funciones helper de pertenencia y rol
CREATE OR REPLACE FUNCTION public.is_member_of(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE organization_id = org_id
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_role_in_org(org_id UUID, allowed_roles TEXT[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.memberships
        WHERE organization_id = org_id
        AND user_id = auth.uid()
        AND role = ANY(allowed_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activar RLS en todas las tablas
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.valves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.irrigation_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

-- 12.1 Organizaciones
CREATE POLICY "Users can view organizations they belong to"
ON public.organizations FOR SELECT
USING (public.is_member_of(id));

-- 12.2 Memberships
CREATE POLICY "Users can view their memberships"
ON public.memberships FOR SELECT
USING (user_id = auth.uid());

-- 12.3 Plots
CREATE POLICY "Users can view plots of their organizations"
ON public.plots FOR SELECT
USING (public.is_member_of(organization_id));

CREATE POLICY "Producers and operators can update plot thresholds"
ON public.plots FOR UPDATE
USING (public.has_role_in_org(organization_id, ARRAY['producer', 'operator']))
WITH CHECK (public.has_role_in_org(organization_id, ARRAY['producer', 'operator']));

-- 12.4 Stations
CREATE POLICY "Users can view stations of their plots"
ON public.stations FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.plots p
    WHERE p.id = stations.plot_id AND public.is_member_of(p.organization_id)
));

-- 12.5 Readings
CREATE POLICY "Users can view readings of their stations"
ON public.readings FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.stations s
    JOIN public.plots p ON p.id = s.plot_id
    WHERE s.id = readings.station_id AND public.is_member_of(p.organization_id)
));

CREATE POLICY "Users can insert manual readings"
ON public.readings FOR INSERT
WITH CHECK (
    source = 'manual' AND
    EXISTS (
        SELECT 1 FROM public.stations s
        JOIN public.plots p ON p.id = s.plot_id
        WHERE s.id = readings.station_id 
        AND public.has_role_in_org(p.organization_id, ARRAY['producer', 'operator'])
    )
);

-- 12.6 Valves
CREATE POLICY "Users can view valves of their plots"
ON public.valves FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.plots p
    WHERE p.id = valves.plot_id AND public.is_member_of(p.organization_id)
));

-- 12.7 Irrigation Commands
CREATE POLICY "Users can view commands of their valves"
ON public.irrigation_commands FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.valves v
    JOIN public.plots p ON p.id = v.plot_id
    WHERE v.id = irrigation_commands.valve_id AND public.is_member_of(p.organization_id)
));

CREATE POLICY "Producers and operators can create irrigation commands"
ON public.irrigation_commands FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.valves v
        JOIN public.plots p ON p.id = v.plot_id
        WHERE v.id = irrigation_commands.valve_id 
        AND public.has_role_in_org(p.organization_id, ARRAY['producer', 'operator'])
    )
);

CREATE POLICY "Producers and operators can cancel pending commands"
ON public.irrigation_commands FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.valves v
        JOIN public.plots p ON p.id = v.plot_id
        WHERE v.id = irrigation_commands.valve_id 
        AND public.has_role_in_org(p.organization_id, ARRAY['producer', 'operator'])
    )
)
WITH CHECK (status = 'cancelled');

-- 12.8 Alerts
CREATE POLICY "Users can view alerts of their plots"
ON public.alerts FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.plots p
    WHERE p.id = alerts.plot_id AND public.is_member_of(p.organization_id)
));
