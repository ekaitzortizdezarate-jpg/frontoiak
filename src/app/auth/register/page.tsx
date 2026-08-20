'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'
import LanguageSelector from '@/components/LanguageSelector'

export default function RegisterPage() {
  const [tipoCuenta, setTipoCuenta] = useState<'usuario' | 'gestor_municipio'>('usuario')
  const { t } = useLanguage()
  
  // Campos comunes
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [apellidos, setApellidos] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // Campos de ubicación compartidos (BD)
  const [provincias, setProvincias] = useState<any[]>([])
  const [municipiosDisponibles, setMunicipiosDisponibles] = useState<any[]>([])
  const [selectedProvinciaId, setSelectedProvinciaId] = useState('')
  const [selectedMunicipioId, setSelectedMunicipioId] = useState('')
  const [codigosPostales, setCodigosPostales] = useState<string[]>([])
  const [codigoPostal, setCodigoPostal] = useState('')
  const [localidad, setLocalidad] = useState('')

  // Campos específicos de Ciudadano
  const [dni, setDni] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [calle, setCalle] = useState('')

  // Campos específicos de Gestor Municipal
  const [calleAyuntamiento, setCalleAyuntamiento] = useState('')
  const [nuevoCp, setNuevoCp] = useState('')

  const router = useRouter()

  useEffect(() => {
    cargarProvincias()
  }, [])

  const cargarProvincias = async () => {
    const { data } = await supabase.from('provincias').select('*').order('nombre', { ascending: true })
    setProvincias(data || [])
  }

  const handleProvinciaChange = async (provId: string) => {
    setSelectedProvinciaId(provId)
    setSelectedMunicipioId('')
    setLocalidad('')
    setCodigoPostal('')
    setCodigosPostales([])

    if (!provId) {
      setMunicipiosDisponibles([])
      return
    }

    const { data: munData } = await supabase
      .from('municipios')
      .select('*')
      .eq('provincia_id', provId)
      .order('nombre', { ascending: true })

    setMunicipiosDisponibles(munData || [])
  }

  const handleMunicipioChange = (munId: string) => {
    setSelectedMunicipioId(munId)
    const mun = municipiosDisponibles.find(m => m.id === munId)
    if (mun) {
      const cps = mun.codigos_postales || []
      setCodigosPostales(cps)
      setLocalidad(mun.nombre)
      if (cps.length === 1) {
        setCodigoPostal(cps[0])
      } else if (!cps.includes(codigoPostal)) {
        setCodigoPostal('')
      }
    } else {
      setCodigosPostales([])
      setLocalidad('')
      setCodigoPostal('')
    }
  }

  const handleAddCp = () => {
    const cpLimpio = nuevoCp.trim()
    if (cpLimpio && !codigosPostales.includes(cpLimpio)) {
      setCodigosPostales([...codigosPostales, cpLimpio])
      setNuevoCp('')
    }
  }

  const handleRemoveCp = (cpToRemove: string) => {
    setCodigosPostales(codigosPostales.filter(cp => cp !== cpToRemove))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    if (tipoCuenta === 'gestor_municipio') {
      if (!selectedProvinciaId || !selectedMunicipioId) {
        setErrorMsg(t.reservas.select_province + ' / ' + t.reservas.select_municipality)
        setLoading(false)
        return
      }

      // Registro como Gestor Municipal
      const nombreCompleto = apellidos ? `${nombre.trim()} ${apellidos.trim()}` : nombre.trim()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/admin/dashboard` : undefined,
          data: {
            nombre_completo: nombreCompleto,
            nombre: nombre.trim(),
            apellidos: apellidos ? apellidos.trim() : '',
            municipio_id: selectedMunicipioId,
            provincia_id: selectedProvinciaId,
            calle: calleAyuntamiento.trim(),
            role: 'gestor_municipio',
            estado_aprobacion: 'pendiente'
          }
        }
      })

      if (authError) {
        setErrorMsg(authError.message)
        setLoading(false)
        return
      }

      if (authData.user) {
        if (authData.session) {
          await supabase.from('profiles').upsert({
            id: authData.user.id,
            email,
            nombre: nombre.trim(),
            apellidos: apellidos ? apellidos.trim() : '',
            nombre_completo: nombreCompleto,
            municipio_id: selectedMunicipioId,
            calle: calleAyuntamiento.trim(),
            role: 'gestor_municipio',
            estado_aprobacion: 'pendiente'
          })

          if (codigosPostales.length > 0) {
            await supabase.from('municipios').update({ codigos_postales: codigosPostales }).eq('id', selectedMunicipioId)
          }
        }

        alert('¡Solicitud de Gestor Municipal registrada con éxito! Tu cuenta está pendiente de validación por el Administrador de la plataforma. Recibirás acceso una vez sea aprobada.')
        router.push('/admin/dashboard')
      }

      setLoading(false)
      return
    }

    // Registro como Ciudadano / Pelotari
    if (!selectedProvinciaId) {
      setErrorMsg(t.reservas.select_province || 'Por favor selecciona una provincia.')
      setLoading(false)
      return
    }
    if (!selectedMunicipioId) {
      setErrorMsg(t.reservas.select_municipality || 'Por favor selecciona una población / municipio.')
      setLoading(false)
      return
    }
    if (!codigoPostal) {
      setErrorMsg(t.auth.select_postal_code || 'Por favor selecciona o introduce un código postal.')
      setLoading(false)
      return
    }

    const mun = municipiosDisponibles.find(m => m.id === selectedMunicipioId)
    const nombreMunicipio = mun?.nombre || localidad || ''
    const nombreCompleto = apellidos ? `${nombre.trim()} ${apellidos.trim()}` : nombre.trim()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reservas` : undefined,
        data: {
          nombre_completo: nombreCompleto,
          nombre: nombre.trim(),
          apellidos: apellidos ? apellidos.trim() : '',
          dni: dni.trim(),
          fecha_nacimiento: fechaNacimiento || null,
          provincia_id: selectedProvinciaId,
          municipio_id: selectedMunicipioId,
          localidad: nombreMunicipio,
          codigo_postal: codigoPostal.trim(),
          calle: calle.trim(),
          role: 'usuario'
        }
      }
    })

    if (authError) {
      setErrorMsg(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      if (authData.session) {
        await supabase.from('profiles').upsert({
          id: authData.user.id,
          email,
          nombre: nombre.trim(),
          nombre_completo: nombreCompleto,
          apellidos: apellidos ? apellidos.trim() : '',
          dni: dni.trim(),
          fecha_nacimiento: fechaNacimiento || null,
          municipio_id: selectedMunicipioId,
          localidad: nombreMunicipio,
          codigo_postal: codigoPostal.trim(),
          calle: calle.trim(),
          role: 'usuario'
        })
      }

      alert('¡Registro completado con éxito! Ya puedes iniciar sesión.')
      router.push('/reservas')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between selection:bg-emerald-100 selection:text-emerald-900">
      {/* HEADER */}
      <header className="bg-white/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center gap-2 sm:gap-4">
          {/* IZQUIERDA: Frontoiak */}
          <div className="flex flex-col items-start min-w-0">
            <div 
              onClick={() => router.push('/')}
              className="flex items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-700 rounded-xl flex items-center justify-center text-white font-black text-sm sm:text-base shadow-sm group-hover:bg-emerald-800 transition">
                F
              </div>
              <span className="text-lg sm:text-xl font-black text-stone-900 tracking-tight">
                Frontoiak
              </span>
            </div>
          </div>

          {/* DERECHA: Iniciar Sesión y debajo idiomas */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Link 
              href="/auth/login"
              className="bg-stone-100 text-stone-700 hover:bg-stone-200 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition shadow-2xs whitespace-nowrap active:scale-95"
            >
              {t.common.login}
            </Link>
            <div>
              <LanguageSelector variant="light" />
            </div>
          </div>
        </div>
      </header>

      {/* CONTENIDO */}
      <main className="flex-1 flex flex-col justify-center py-10 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl px-4">
          <h2 className="text-center text-2xl font-black text-stone-900 tracking-tight">
            {t.auth.register_title}
          </h2>
          <p className="mt-1 text-center text-xs text-stone-500">
            {t.auth.register_subtitle}
          </p>

          {/* SELECTOR DE TIPO DE CUENTA */}
          <div className="flex bg-stone-200/80 p-1 rounded-2xl mt-6 border border-stone-200">
            <button
              type="button"
              onClick={() => {
                setTipoCuenta('usuario')
                setErrorMsg('')
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                tipoCuenta === 'usuario'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>{t.auth.tab_user}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTipoCuenta('gestor_municipio')
                setErrorMsg('')
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                tipoCuenta === 'gestor_municipio'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <span>{t.auth.tab_gestor}</span>
            </button>
          </div>
        </div>

        <div className="mt-4 sm:mx-auto sm:w-full sm:max-w-xl px-4">
          <div className="bg-white py-8 px-6 shadow-sm border border-stone-200 rounded-3xl sm:px-10">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-medium">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              {tipoCuenta === 'gestor_municipio' ? (
                /* FORMULARIO GESTOR MUNICIPAL:
                   1. Nombre, 2. Apellidos, 3. Provincia, 4. Municipio, 5. Códigos Postales, 6. Calle del Ayuntamiento, 7. Correo, 8. Contraseña */
                <>
                  <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs space-y-1">
                    <span className="font-bold flex items-center gap-1.5">{t.auth.gestor_notice_title}</span>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      {t.auth.gestor_notice_desc}
                    </p>
                  </div>

                  {/* 1 & 2: Nombre & Apellidos */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.name} *
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="ej. Jon"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.last_name}
                      </label>
                      <input
                        type="text"
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        placeholder="ej. Pérez Gómez"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  {/* 3 & 4: Provincia & Municipio */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.province} *
                      </label>
                      <select
                        value={selectedProvinciaId}
                        onChange={(e) => handleProvinciaChange(e.target.value)}
                        required
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      >
                        <option value="">{t.reservas.select_province}</option>
                        {provincias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.municipality} *
                      </label>
                      <select
                        value={selectedMunicipioId}
                        onChange={(e) => handleMunicipioChange(e.target.value)}
                        required
                        disabled={!selectedProvinciaId}
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white disabled:bg-stone-100 disabled:text-stone-400 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      >
                        <option value="">{t.reservas.select_municipality}</option>
                        {municipiosDisponibles.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* 5: Códigos Postales del Municipio */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                      Códigos Postales del Municipio
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2 min-h-[36px] items-center">
                      {codigosPostales.length > 0 ? (
                        codigosPostales.map((cp) => (
                          <span 
                            key={cp} 
                            className="bg-stone-50 border border-stone-300 px-3 py-1 rounded-xl text-xs font-bold text-stone-700 shadow-2xs flex items-center gap-1.5"
                          >
                            <span>{cp}</span>
                            <button 
                              type="button" 
                              onClick={() => handleRemoveCp(cp)} 
                              className="text-rose-500 hover:text-rose-700 font-black ml-1 text-sm leading-none"
                              title="Eliminar código postal"
                            >
                              ×
                            </button>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-stone-400 italic">No hay códigos postales configurados</span>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Añadir C.P. (ej. 20500)" 
                        value={nuevoCp}
                        onChange={(e) => setNuevoCp(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            handleAddCp()
                          }
                        }}
                        className="p-2.5 border border-stone-300 rounded-xl flex-1 text-sm bg-stone-50 focus:bg-white focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                      <button 
                        type="button" 
                        onClick={handleAddCp} 
                        className="bg-stone-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-stone-900 transition"
                      >
                        Añadir C.P.
                      </button>
                    </div>
                  </div>

                  {/* 6: Calle del Ayuntamiento */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                      {t.auth.address_ayuntamiento}
                    </label>
                    <input
                      type="text"
                      value={calleAyuntamiento}
                      onChange={(e) => setCalleAyuntamiento(e.target.value)}
                      placeholder="ej. Plaza Mayor, 1 / Herriko Plaza, 1"
                      className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <hr className="border-stone-100 my-2" />

                  {/* 7 & 8: Correo & Contraseña */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.email} *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="gestor@ayuntamiento.eus"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.password} *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 text-white p-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300 cursor-pointer"
                    >
                      {loading ? t.auth.creating_account : t.auth.create_account}
                    </button>
                  </div>
                </>
              ) : (
                /* FORMULARIO CIUDADANO / PELOTARI:
                   1. Nombre, 2. Apellidos, 3. DNI, 4. Fecha, 5. Provincia, 6. Municipio, 7. Código Postal, 8. Calle, 9. Correo, 10. Contraseña */
                <>
                  {/* 1 & 2: Nombre & Apellidos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.name} *
                      </label>
                      <input
                        type="text"
                        required
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="ej. Mikel"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.last_name} *
                      </label>
                      <input
                        type="text"
                        required
                        value={apellidos}
                        onChange={(e) => setApellidos(e.target.value)}
                        placeholder="ej. Larrañaga Agirre"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  {/* 3 & 4: DNI & Fecha */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.dni} *
                      </label>
                      <input
                        type="text"
                        required
                        value={dni}
                        onChange={(e) => setDni(e.target.value)}
                        placeholder="12345678Z"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.birth_date}
                      </label>
                      <input
                        type="date"
                        value={fechaNacimiento}
                        onChange={(e) => setFechaNacimiento(e.target.value)}
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  {/* 5, 6 & 7: Provincia, Municipio & Código Postal */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.province} *
                      </label>
                      <select
                        value={selectedProvinciaId}
                        onChange={(e) => handleProvinciaChange(e.target.value)}
                        required
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      >
                        <option value="">{t.reservas.select_province}</option>
                        {provincias.map(p => (
                          <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.municipality} *
                      </label>
                      <select
                        value={selectedMunicipioId}
                        onChange={(e) => handleMunicipioChange(e.target.value)}
                        required
                        disabled={!selectedProvinciaId}
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white disabled:bg-stone-100 disabled:text-stone-400 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      >
                        <option value="">{t.reservas.select_municipality}</option>
                        {municipiosDisponibles.map(m => (
                          <option key={m.id} value={m.id}>{m.nombre}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.postal_code} *
                      </label>
                      {codigosPostales.length > 0 ? (
                        <select
                          value={codigoPostal}
                          onChange={(e) => setCodigoPostal(e.target.value)}
                          required
                          disabled={!selectedMunicipioId}
                          className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white disabled:bg-stone-100 disabled:text-stone-400 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                        >
                          <option value="">{t.auth.select_postal_code}</option>
                          {codigosPostales.map(cp => (
                            <option key={cp} value={cp}>{cp}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          required
                          disabled={!selectedMunicipioId}
                          value={codigoPostal}
                          onChange={(e) => setCodigoPostal(e.target.value)}
                          placeholder="ej. 20001"
                          className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white disabled:bg-stone-100 disabled:text-stone-400 text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                        />
                      )}
                    </div>
                  </div>

                  {/* 8: Calle */}
                  <div>
                    <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                      {t.auth.address} *
                    </label>
                    <input
                      type="text"
                      required
                      value={calle}
                      onChange={(e) => setCalle(e.target.value)}
                      placeholder="ej. Kale Nagusia, 12, 1º A"
                      className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                    />
                  </div>

                  <hr className="border-stone-100 my-2" />

                  {/* 9 & 10: Correo & Contraseña */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.email} *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="mikel@adibidea.eus"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-1">
                        {t.auth.password} *
                      </label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full p-3 border border-stone-300 rounded-2xl text-sm bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-emerald-600 focus:outline-none transition font-medium"
                      />
                    </div>
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-emerald-700 text-white p-3.5 rounded-2xl text-sm font-bold hover:bg-emerald-800 transition shadow-sm active:scale-95 disabled:bg-stone-300 cursor-pointer"
                    >
                      {loading ? t.auth.creating_account : t.auth.create_account}
                    </button>
                  </div>
                </>
              )}

              <div className="text-center pt-2">
                <span className="text-xs text-stone-500">{t.auth.already_have_account} </span>
                <Link href="/auth/login" className="text-xs font-bold text-emerald-700 hover:underline">
                  {t.common.login}
                </Link>
              </div>
            </form>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-stone-200 py-6 text-center text-xs text-stone-400">
        {t.home.footer}
      </footer>
    </div>
  )
}