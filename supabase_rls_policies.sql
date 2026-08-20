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
