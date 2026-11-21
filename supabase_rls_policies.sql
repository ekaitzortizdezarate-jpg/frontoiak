-- ==============================================================================
-- FRONTOIAK: POLÍTICAS DE SEGURIDAD A NIVEL DE FILA (ROW LEVEL SECURITY - RLS)
-- ==============================================================================
-- Ejecuta este script en el Editor SQL de tu panel de Supabase.
-- Este script activa RLS en todas las tablas y define los permisos adecuados
-- para ciudadanos, gestores municipales y superadministradores.
-- ==============================================================================

-- 1. TABLA: PROVINCIAS
ALTER TABLE provincias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de provincias" ON provincias;
CREATE POLICY "Lectura publica de provincias"
  ON provincias FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Solo administradores pueden modificar provincias" ON provincias;
CREATE POLICY "Solo administradores pueden modificar provincias"
  ON provincias FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 2. TABLA: MUNICIPIOS
ALTER TABLE municipios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de municipios" ON municipios;
CREATE POLICY "Lectura publica de municipios"
  ON municipios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Gestores y admins pueden modificar su municipio" ON municipios;
CREATE POLICY "Gestores y admins pueden modificar su municipio"
  ON municipios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin' 
        OR (profiles.role = 'gestor_municipio' AND profiles.municipio_id = municipios.id)
      )
    )
  );

DROP POLICY IF EXISTS "Solo admins pueden crear o borrar municipios" ON municipios;
CREATE POLICY "Solo admins pueden crear o borrar municipios"
  ON municipios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 3. TABLA: PROFILES
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de perfiles propios, de gestor municipal o admin" ON profiles;
CREATE POLICY "Lectura de perfiles propios, de gestor municipal o admin"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM profiles AS admin_p
      WHERE admin_p.id = auth.uid()
      AND (
        admin_p.role = 'admin'
        OR (admin_p.role = 'gestor_municipio' AND admin_p.municipio_id = profiles.municipio_id)
      )
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden actualizar su propio perfil" ON profiles;
CREATE POLICY "Usuarios pueden actualizar su propio perfil"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    -- Los usuarios normales no pueden auto-asignarse rol de admin o gestor
    auth.uid() = id AND (
      role = (SELECT p.role FROM profiles p WHERE p.id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  );

DROP POLICY IF EXISTS "Insercion inicial de perfil propio" ON profiles;
CREATE POLICY "Insercion inicial de perfil propio"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Superadmin puede gestionar todos los perfiles" ON profiles;
CREATE POLICY "Superadmin puede gestionar todos los perfiles"
  ON profiles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- 4. TABLA: FRONTONES
ALTER TABLE frontones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de frontones habilitados" ON frontones;
CREATE POLICY "Lectura publica de frontones habilitados"
  ON frontones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Gestores y admins pueden gestionar frontones de su municipio" ON frontones;
CREATE POLICY "Gestores y admins pueden gestionar frontones de su municipio"
  ON frontones FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (profiles.role = 'gestor_municipio' AND profiles.municipio_id = frontones.municipio_id)
      )
    )
  );

-- 5. TABLA: EVENTOS_FRONTON (RESERVAS Y OCUPACIÓN)
ALTER TABLE eventos_fronton ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de eventos y reservas para calendario" ON eventos_fronton;
CREATE POLICY "Lectura publica de eventos y reservas para calendario"
  ON eventos_fronton FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios autenticados pueden crear sus propias reservas" ON eventos_fronton;
CREATE POLICY "Usuarios autenticados pueden crear sus propias reservas"
  ON eventos_fronton FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = eventos_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

DROP POLICY IF EXISTS "Usuarios pueden cancelar sus propias reservas y gestores las de su fronton" ON eventos_fronton;
CREATE POLICY "Usuarios pueden cancelar sus propias reservas y gestores las de su fronton"
  ON eventos_fronton FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = eventos_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

-- 6. TABLA: INCIDENCIAS_FRONTON
ALTER TABLE incidencias_fronton ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuarios ven sus incidencias y gestores las de su municipio" ON incidencias_fronton;
CREATE POLICY "Usuarios ven sus incidencias y gestores las de su municipio"
  ON incidencias_fronton FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = incidencias_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

DROP POLICY IF EXISTS "Usuarios autenticados pueden reportar incidencias" ON incidencias_fronton;
CREATE POLICY "Usuarios autenticados pueden reportar incidencias"
  ON incidencias_fronton FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Gestores y admins pueden actualizar estado de incidencias" ON incidencias_fronton;
CREATE POLICY "Gestores y admins pueden actualizar estado de incidencias"
  ON incidencias_fronton FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = incidencias_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

DROP POLICY IF EXISTS "Gestores y admins pueden eliminar incidencias" ON incidencias_fronton;
CREATE POLICY "Gestores y admins pueden eliminar incidencias"
  ON incidencias_fronton FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = incidencias_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

-- ==============================================================================
-- 7. TABLA Y POLÍTICAS: MENSAJES_FORO_FRONTON (FORO / CHAT PÚBLICO DEL FRONTÓN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS mensajes_foro_fronton (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fronton_id UUID NOT NULL REFERENCES frontones(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT DEFAULT 'usuario',
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Si la tabla ya existía, añadir columna user_email si no existe
ALTER TABLE mensajes_foro_fronton ADD COLUMN IF NOT EXISTS user_email TEXT;

-- Habilitar RLS en mensajes_foro_fronton
ALTER TABLE mensajes_foro_fronton ENABLE ROW LEVEL SECURITY;

-- 1. Lectura pública de mensajes para todos los usuarios autenticados y anónimos
DROP POLICY IF EXISTS "Lectura publica de mensajes del foro" ON mensajes_foro_fronton;
CREATE POLICY "Lectura publica de mensajes del foro"
  ON mensajes_foro_fronton FOR SELECT
  USING (true);

-- 2. Creación de mensajes por cualquier usuario autenticado (pelotaris y gestores)
DROP POLICY IF EXISTS "Usuarios autenticados pueden publicar en el foro" ON mensajes_foro_fronton;
CREATE POLICY "Usuarios autenticados pueden publicar en el foro"
  ON mensajes_foro_fronton FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 3. Moderación: Gestores y Admins pueden eliminar mensajes si es necesario
DROP POLICY IF EXISTS "Gestores y admins pueden moderar el foro" ON mensajes_foro_fronton;
CREATE POLICY "Gestores y admins pueden moderar el foro"
  ON mensajes_foro_fronton FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles p
      JOIN frontones f ON f.id = mensajes_foro_fronton.fronton_id
      WHERE p.id = auth.uid()
      AND (p.role = 'admin' OR (p.role = 'gestor_municipio' AND p.municipio_id = f.municipio_id))
    )
  );

-- Habilitar columna limitar_antelacion en frontones si no existe
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS limitar_antelacion BOOLEAN DEFAULT true;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS limitar_horario BOOLEAN DEFAULT true;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS limitar_slot BOOLEAN DEFAULT true;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS limitar_max_reservas BOOLEAN DEFAULT true;

-- ==============================================================================
-- 8. SISTEMA IOT AVANZADO: PARÁMETROS REMOTOS, CALIBRACIÓN Y TELEMETRÍA
-- ==============================================================================

-- 8.1. Columnas de configuración remota y diagnóstico en tabla frontones
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_modo TEXT DEFAULT 'normal';
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_config_hasta TIMESTAMPTZ NULL;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_umbral_sonido INTEGER DEFAULT 1200;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_golpes_minimos INTEGER DEFAULT 3;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_muestreo_seg INTEGER DEFAULT 20;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_dormir_seg INTEGER DEFAULT 270;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_rebote_ms INTEGER DEFAULT 180;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_hora_inicio_activa TIME DEFAULT '07:00';
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_hora_fin_activa TIME DEFAULT '23:30';
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS iot_factor_voltaje NUMERIC(4,2) DEFAULT 2.00;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS bateria_porcentaje INTEGER NULL;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS bateria_voltaje NUMERIC(4,2) NULL;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS ultimo_aviso_iot TIMESTAMPTZ NULL;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS ultimo_conteo_golpes INTEGER NULL;
ALTER TABLE frontones ADD COLUMN IF NOT EXISTS ultima_amplitud_max INTEGER NULL;

-- 8.2. Asegurar existencia de tabla telemetria_iot con restricción única para upsert
CREATE TABLE IF NOT EXISTS telemetria_iot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fronton_id UUID NOT NULL REFERENCES frontones(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  hora_fin TIME NOT NULL,
  presencia_detectada BOOLEAN DEFAULT false,
  en_uso BOOLEAN DEFAULT false,
  bateria_porcentaje INTEGER NULL,
  bateria_voltaje NUMERIC(4,2) NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_telemetria_fronton_fecha_slot UNIQUE (fronton_id, fecha, hora_inicio)
);

ALTER TABLE telemetria_iot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de telemetria_iot" ON telemetria_iot;
CREATE POLICY "Lectura publica de telemetria_iot"
  ON telemetria_iot FOR SELECT
  USING (true);

-- 8.3. Función RPC registrar_pulso_iot (seguridad definer para permitir actualización desde ESP32 con anon key)
CREATE OR REPLACE FUNCTION registrar_pulso_iot(
  p_token text,
  p_en_uso boolean,
  p_fecha date,
  p_hora_inicio time,
  p_hora_fin time,
  p_bateria_pct integer default null,
  p_bateria_v numeric default null,
  p_golpes integer default null,
  p_amplitud_max integer default null
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_fronton RECORD;
  v_modo_actual text;
  v_config_hasta timestamptz;
BEGIN
  -- 1. Buscar el frontón correspondiente mediante hardware_token
  SELECT id, iot_modo, iot_config_hasta, iot_umbral_sonido, iot_golpes_minimos,
         iot_muestreo_seg, iot_dormir_seg, iot_rebote_ms,
         iot_hora_inicio_activa, iot_hora_fin_activa, iot_factor_voltaje
  INTO v_fronton
  FROM frontones
  WHERE hardware_token::text = p_token::text
    AND tiene_sensor_iot = true
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'error', 'Token invalido o sensor inactivo');
  END IF;

  v_modo_actual := COALESCE(v_fronton.iot_modo, 'normal');
  v_config_hasta := v_fronton.iot_config_hasta;

  -- 2. Si estaba en modo config y se ha superado el tiempo de 30 minutos, auto-retorno a normal
  IF v_modo_actual = 'config' AND v_config_hasta IS NOT NULL AND v_config_hasta < now() THEN
    v_modo_actual := 'normal';
    v_config_hasta := NULL;
  END IF;

  -- 3. Actualizar estado y métricas en la tabla frontones
  UPDATE frontones
  SET
    en_uso = p_en_uso,
    ultimo_aviso_iot = now(),
    iot_modo = v_modo_actual,
    iot_config_hasta = v_config_hasta,
    bateria_porcentaje = COALESCE(p_bateria_pct, bateria_porcentaje),
    bateria_voltaje = COALESCE(p_bateria_v::numeric(4,2), bateria_voltaje),
    ultimo_conteo_golpes = COALESCE(p_golpes, ultimo_conteo_golpes),
    ultima_amplitud_max = COALESCE(p_amplitud_max, ultima_amplitud_max)
  WHERE id = v_fronton.id;

  -- 4. Insertar o actualizar la franja horaria en telemetria_iot
  INSERT INTO telemetria_iot (
    fronton_id, fecha, hora_inicio, hora_fin, presencia_detectada, en_uso, bateria_porcentaje, bateria_voltaje, created_at
  )
  VALUES (
    v_fronton.id, p_fecha, p_hora_inicio, p_hora_fin, p_en_uso, p_en_uso, p_bateria_pct, p_bateria_v::numeric(4,2), now()
  )
  ON CONFLICT (fronton_id, fecha, hora_inicio)
  DO UPDATE SET
    presencia_detectada = telemetria_iot.presencia_detectada OR EXCLUDED.presencia_detectada,
    en_uso = telemetria_iot.en_uso OR EXCLUDED.en_uso,
    hora_fin = EXCLUDED.hora_fin,
    bateria_porcentaje = COALESCE(EXCLUDED.bateria_porcentaje, telemetria_iot.bateria_porcentaje),
    bateria_voltaje = COALESCE(EXCLUDED.bateria_voltaje, telemetria_iot.bateria_voltaje),
    created_at = now();

  -- 5. Devolver confirmación y configuración remota actualizada al ESP32
  RETURN json_build_object(
    'ok', true,
    'fronton_id', v_fronton.id,
    'en_uso', p_en_uso,
    'config', json_build_object(
      'modo', v_modo_actual,
      'umbral_sonido', COALESCE(v_fronton.iot_umbral_sonido, 1200),
      'golpes_minimos', COALESCE(v_fronton.iot_golpes_minimos, 3),
      'muestreo_seg', COALESCE(v_fronton.iot_muestreo_seg, 20),
      'dormir_seg', COALESCE(v_fronton.iot_dormir_seg, 270),
      'rebote_ms', COALESCE(v_fronton.iot_rebote_ms, 180),
      'hora_inicio_activa', TO_CHAR(COALESCE(v_fronton.iot_hora_inicio_activa, '07:00'::time), 'HH24:MI'),
      'hora_fin_activa', TO_CHAR(COALESCE(v_fronton.iot_hora_fin_activa, '23:30'::time), 'HH24:MI'),
      'factor_voltaje', COALESCE(v_fronton.iot_factor_voltaje, 2.00)
    )
  );
END;
$$;
