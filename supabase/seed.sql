-- ==============================================================================
-- AgroPulse — Datos de prueba (Concordia, Entre Ríos)
-- ==============================================================================

-- 1. Organización Ficticia: "Estancia Didáctica Concordia"
INSERT INTO public.organizations (id, name, region)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Estancia Didáctica Concordia',
    'Concordia, Entre Ríos, Argentina'
) ON CONFLICT (id) DO NOTHING;

-- 2. Lotes (Plots) con polígonos GeoJSON (coordenadas reales de zona rural de Concordia)
-- Costa 1: Citrus - Humedad óptima (verde)
INSERT INTO public.plots (id, organization_id, name, crop, geom, threshold_min, threshold_max)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Costa 1',
    'Citrus (Naranjas Valencia)',
    '{
        "type": "Polygon",
        "coordinates": [[
            [-58.0410, -31.3680],
            [-58.0350, -31.3680],
            [-58.0350, -31.3740],
            [-58.0410, -31.3740],
            [-58.0410, -31.3680]
        ]]
    }'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO NOTHING;

-- Costa 2: Citrus - Seco (rojo) para demostrar el Happy Path de riego
INSERT INTO public.plots (id, organization_id, name, crop, geom, threshold_min, threshold_max)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'Costa 2',
    'Citrus (Mandarinas Criollas)',
    '{
        "type": "Polygon",
        "coordinates": [[
            [-58.0340, -31.3680],
            [-58.0280, -31.3680],
            [-58.0280, -31.3740],
            [-58.0340, -31.3740],
            [-58.0340, -31.3680]
        ]]
    }'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO NOTHING;

-- Monte A: Soja - Stale (gris) para demostrar sensor apagado > 15 min
INSERT INTO public.plots (id, organization_id, name, crop, geom, threshold_min, threshold_max)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'Monte A',
    'Soja 1ra',
    '{
        "type": "Polygon",
        "coordinates": [[
            [-58.0410, -31.3760],
            [-58.0310, -31.3760],
            [-58.0310, -31.3830],
            [-58.0410, -31.3830],
            [-58.0410, -31.3760]
        ]]
    }'::jsonb,
    25.0,
    45.0
) ON CONFLICT (id) DO NOTHING;

-- 3. Estaciones de medición (una por cada lote)
INSERT INTO public.stations (id, plot_id, name, lat, lng)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Estación C1-Sonda Norte', -31.3710, -58.0380),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Estación C2-Sonda Sur', -31.3710, -58.0310),
    ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Estación MA-Sonda Central', -31.3795, -58.0360)
ON CONFLICT (id) DO NOTHING;

-- 4. Válvulas de Riego (al menos 1 por lote)
INSERT INTO public.valves (id, plot_id, name, status)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Válvula Goteo Sector 1', 'closed'),
    ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 'Válvula Principal Costa 2', 'closed'),
    ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', 'Válvula Aspersión Monte A', 'closed')
ON CONFLICT (id) DO NOTHING;

-- 5. Lecturas de Semilla (Historial de 6h para alimentar los gráficos de la UI)
-- Costa 1: Humedad Óptima (alrededor de 34% - 37%)
INSERT INTO public.readings (station_id, measured_at, moisture_pct, temp_c, rain_mm, source)
SELECT 
    'c0000000-0000-0000-0000-000000000001',
    now() - (interval '30 minutes' * s),
    35.0 + (sin(s::numeric) * 2.0),
    22.5 + (cos(s::numeric) * 1.5),
    0.0,
    'sensor'
FROM generate_series(0, 12) AS s;

-- Costa 2: Seco (alrededor de 17% - 19%, por debajo del umbral mínimo de 25%)
INSERT INTO public.readings (station_id, measured_at, moisture_pct, temp_c, rain_mm, source)
SELECT 
    'c0000000-0000-0000-0000-000000000002',
    now() - (interval '30 minutes' * s),
    18.5 - (s * 0.2),
    25.0 + (s * 0.3),
    0.0,
    'sensor'
FROM generate_series(0, 12) AS s;

-- Monte A: Stale (última lectura generada hace 25 minutos para disparar estado stale > 15 min)
INSERT INTO public.readings (station_id, measured_at, moisture_pct, temp_c, rain_mm, source)
SELECT 
    'c0000000-0000-0000-0000-000000000003',
    now() - interval '25 minutes' - (interval '30 minutes' * s),
    28.0 + (sin(s::numeric) * 1.0),
    21.0,
    0.0,
    'sensor'
FROM generate_series(0, 12) AS s;

-- ==============================================================================
-- 6. Trigger automático para asignar membership a los usuarios de prueba
-- Al crearse usuarios en auth.users, se vinculan automáticamente a la Estancia Concordia
-- con el rol que indique su email:
--   productor@agropulse.test -> producer
--   operador@agropulse.test  -> operator
--   asesor@agropulse.test    -> advisor
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user_membership()
RETURNS TRIGGER AS $$
DECLARE
    org_id UUID := 'a0000000-0000-0000-0000-000000000001';
    user_role TEXT := 'producer';
BEGIN
    IF NEW.email ILIKE '%operador%' THEN
        user_role := 'operator';
    ELSIF NEW.email ILIKE '%asesor%' THEN
        user_role := 'advisor';
    ELSE
        user_role := 'producer';
    END IF;

    INSERT INTO public.memberships (user_id, organization_id, role)
    VALUES (NEW.id, org_id, user_role)
    ON CONFLICT (user_id, organization_id) DO UPDATE SET role = user_role;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_assign_membership ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_membership
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_membership();
