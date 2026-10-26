import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Navbar, TabType } from './components/layout/Navbar'
import { OmniboxSearch, SearchResultItem } from './components/search/OmniboxSearch'
import { QRPaymentModal } from './components/payment/QRPaymentModal'
import { ParcelaForm } from './components/forms/ParcelaForm'
import { InhumacionForm } from './components/forms/InhumacionForm'
import { AfiliadoForm } from './components/forms/AfiliadoForm'
import { DashboardView } from './components/views/DashboardView'
import { ParcelasView } from './components/views/ParcelasView'
import { InhumacionesView } from './components/views/InhumacionesView'
import { AfiliadosSeguroView } from './components/views/AfiliadosSeguroView'
import { CajaView } from './components/views/CajaView'
import { ConfiguracionView } from './components/views/ConfiguracionView'
import { CobroCajaData } from './components/modals/CobroCajaModal'
import { CierreCajaModal } from './components/modals/CierreCajaModal'
import { PortalPagoPublico } from './components/payment/PortalPagoPublico'
import { LoginView } from './components/auth/LoginView'
import { PwaInstallPrompt } from './components/pwa/PwaInstallPrompt'
import { Parcela, Inhumacion, AfiliadoSeguro, ConfiguracionCobro } from './types/database'
import { isSupabaseConfigured } from './lib/supabase'
import {
  loadInitialData,
  saveConfigToStorage,
  saveParcelasToStorage,
  saveInhumacionesToStorage,
  saveAfiliadosToStorage,
  savePagoToStorage,
  saveEgresoToStorage,
  deletePagoFromStorage,
  anularPagoSupabase,
  registrarCobroCajaSupabase,
  fetchConfigSupabase,
  saveConfigSupabase,
  fetchParcelasSupabase,
  fetchInhumacionesSupabase,
  fetchAfiliadosSupabase,
  upsertParcelaSupabase,
  deleteParcelaSupabase,
  insertInhumacionSupabase,
  updateInhumacionSupabase,
  deleteInhumacionSupabase,
  upsertAfiliadoSupabase,
  deleteAfiliadoSupabase,
  registrarPagoCuotaSupabase,
  revertirPagoCuotaSupabase,
  registrarPagoSupabase,
  fetchPagosSupabase,
  PagoRecibo,
} from './services/dataService'

export default function App() {
  // Single-User Authentication state
  const [currentUser, setCurrentUser] = useState<{ username: string; name: string; role: string } | null>(() => {
    if (typeof window !== 'undefined') {
      const savedLocal = localStorage.getItem('aeterna_auth_session')
      const savedSession = sessionStorage.getItem('aeterna_auth_session')
      const raw = savedLocal || savedSession
      if (raw) {
        try {
          const parsed = JSON.parse(raw)
          if (parsed && parsed.user) return parsed.user
        } catch (e) {}
      }
    }
    return null
  })

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('aeterna_auth_session')
      sessionStorage.removeItem('aeterna_auth_session')
    }
    setCurrentUser(null)
  }

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard')
  const [searchOpen, setSearchOpen] = useState(false)
  const [cierreCajaOpen, setCierreCajaOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('aeterna_sidebar_collapsed') === 'true'
    }
    return false
  })

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev
      if (typeof window !== 'undefined') {
        localStorage.setItem('aeterna_sidebar_collapsed', String(next))
      }
      return next
    })
  }

  // Detección de vista pública de pago por URL hash (#pago)
  const [isPublicPaymentView, setIsPublicPaymentView] = useState(() => {
    if (typeof window !== 'undefined') {
      return (
        window.location.hash.startsWith('#pago') ||
        window.location.pathname.startsWith('/pago') ||
        window.location.search.includes('pago=1')
      )
    }
    return false
  })

  useEffect(() => {
    const handleHash = () => {
      setIsPublicPaymentView(
        window.location.hash.startsWith('#pago') ||
        window.location.pathname.startsWith('/pago') ||
        window.location.search.includes('pago=1')
      )
    }
    window.addEventListener('hashchange', handleHash)
    window.addEventListener('popstate', handleHash)
    return () => {
      window.removeEventListener('hashchange', handleHash)
      window.removeEventListener('popstate', handleHash)
    }
  }, [])

  // Cargar estado inicial (Storage o Seed)
  const initialData = useMemo(() => loadInitialData(), [])

  const [config, setConfig] = useState<ConfiguracionCobro>(initialData.config)
  const [parcelas, setParcelas] = useState<Parcela[]>(initialData.parcelas)
  const [inhumaciones, setInhumaciones] = useState<Inhumacion[]>(initialData.inhumaciones)
  const [afiliados, setAfiliados] = useState<(AfiliadoSeguro & { cuotasPagadas: number[] })[]>(
    initialData.afiliados
  )
  const [pagos, setPagos] = useState<PagoRecibo[]>(initialData.pagos)

  // Recaudación acumulada
  const [recaudacionHoy, setRecaudacionHoy] = useState(() => {
    const sumPagos = initialData.pagos.reduce((acc, p) => acc + (p.monto || 0), 0)
    return sumPagos > 0 ? sumPagos : 18000 * 3
  })

  // Estado de sincronización en tiempo real con Supabase
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sincronización en vivo desde Supabase si está configurado
  const fetchCloudData = useCallback(async (showLoading = false) => {
    if (!isSupabaseConfigured) return
    if (showLoading) setIsRefreshing(true)

    try {
      const [cloudConfig, cloudParcelas, cloudInhumaciones, cloudAfiliados, cloudPagos] = await Promise.all([
        fetchConfigSupabase(),
        fetchParcelasSupabase(),
        fetchInhumacionesSupabase(),
        fetchAfiliadosSupabase(),
        fetchPagosSupabase(),
      ])

      if (cloudConfig) {
        setConfig(cloudConfig)
        saveConfigToStorage(cloudConfig)
      }
      if (cloudParcelas && cloudParcelas.length > 0) {
        setParcelas(cloudParcelas)
        saveParcelasToStorage(cloudParcelas)
      }
      if (cloudInhumaciones && cloudInhumaciones.length > 0) {
        setInhumaciones(cloudInhumaciones)
        saveInhumacionesToStorage(cloudInhumaciones)
      }
      if (cloudAfiliados && cloudAfiliados.length > 0) {
        setAfiliados(cloudAfiliados)
        saveAfiliadosToStorage(cloudAfiliados)
      }
      if (cloudPagos && cloudPagos.length > 0) {
        setPagos(cloudPagos)
        const sumPagos = cloudPagos
          .filter((p) => p.tipo !== 'egreso')
          .reduce((acc, p) => acc + (p.monto || 0), 0)
        setRecaudacionHoy(sumPagos)
      }
    } catch (err) {
      console.error('Error al sincronizar datos desde Supabase:', err)
    } finally {
      if (showLoading) setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchCloudData(false)
  }, [fetchCloudData])

  // Guardar en Storage al cambiar
  useEffect(() => {
    saveConfigToStorage(config)
  }, [config])

  useEffect(() => {
    saveParcelasToStorage(parcelas)
  }, [parcelas])

  useEffect(() => {
    saveInhumacionesToStorage(inhumaciones)
  }, [inhumaciones])

  useEffect(() => {
    saveAfiliadosToStorage(afiliados)
  }, [afiliados])

  // Estados de modales
  const [qrModal, setQrModal] = useState<{
    isOpen: boolean
    concepto: string
    monto: number
    identificador: string
    titularNombre: string
    onConfirm: (datos?: {
      metodo: 'efectivo' | 'transferencia_qr'
      comprobante: string
      nroRecibo: string
      monto: number
    }) => void | Promise<void>
  }>({
    isOpen: false,
    concepto: '',
    monto: 0,
    identificador: '',
    titularNombre: '',
    onConfirm: () => {},
  })

  const [formParcelaOpen, setFormParcelaOpen] = useState(false)
  const [editingParcela, setEditingParcela] = useState<Parcela | null>(null)

  const [formInhumacionOpen, setFormInhumacionOpen] = useState(false)
  const [editingInhumacion, setEditingInhumacion] = useState<Inhumacion | null>(null)

  const [formAfiliadoOpen, setFormAfiliadoOpen] = useState(false)
  const [editingAfiliado, setEditingAfiliado] = useState<AfiliadoSeguro | null>(null)

  // Omnibox Search Items
  const searchItems = useMemo<SearchResultItem[]>(() => {
    const list: SearchResultItem[] = []

    for (const p of parcelas) {
      const dniStr = p.titular?.dni ? ` · DNI: ${p.titular.dni}` : ''
      list.push({
        id: p.id,
        title: `Parcela ${p.nomenclatura}`,
        subtitle: p.titular
          ? `Titular: ${p.titular.nombre_completo} (${p.titular.direccion || 'Chamical'})${dniStr}`
          : 'Sin titular asignado',
        type: 'parcela',
        badge: p.estado === 'en_mora' ? 'En Mora' : p.estado.toUpperCase(),
        item: p,
      })
    }

    for (const inh of inhumaciones) {
      const pNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
      const dniStr = inh.dni_difunto ? ` · DNI: ${inh.dni_difunto}` : ''
      list.push({
        id: inh.id,
        title: inh.nombre_difunto,
        subtitle: `Inhumado el ${inh.fecha_inhumacion?.slice(0, 10)} - Parcela: ${pNom || 'S/D'}${dniStr}`,
        type: 'difunto',
        badge: inh.es_covid ? 'COVID-19' : 'Ordinario',
        item: inh,
      })
    }

    for (const a of afiliados) {
      const dniStr = a.dni ? ` · DNI: ${a.dni}` : ''
      list.push({
        id: a.id,
        title: `${a.nombre_completo} (#${a.numero_afiliado})`,
        subtitle: `${a.direccion_cobro || 'Chamical'} - ${a.zona_cobro || 'Zona 1'}${dniStr}`,
        type: 'afiliado',
        badge: a.estado === 'activo' ? 'Al Día' : 'En Mora',
        item: a,
      })
    }

    return list
  }, [parcelas, inhumaciones, afiliados])

  // Handlers para cobro con QR
  const handleCobrarParcela = (parcela: Parcela) => {
    const monto = parcela.saldo_mantenimiento > 0 ? parcela.saldo_mantenimiento : 36000
    const concepto = `Mantenimiento Cuatrimestral - Parcela ${parcela.nomenclatura}`
    const titularNombre = parcela.titular?.nombre_completo || 'Titular Parcela'

    setQrModal({
      isOpen: true,
      concepto,
      monto,
      identificador: parcela.nomenclatura,
      titularNombre,
      onConfirm: async (datos) => {
        const montoCobrado = datos?.monto ?? monto
        const nuevoSaldo = Math.max(0, (parcela.saldo_mantenimiento || 0) - montoCobrado)
        const nuevoEstado = nuevoSaldo <= 0 && (parcela.estado === 'en_mora' || parcela.estado === 'standby') ? 'ocupada' : parcela.estado

        const updatedParcela: Parcela = {
          ...parcela,
          saldo_mantenimiento: nuevoSaldo,
          estado: nuevoEstado,
        }

        setParcelas((prev) => {
          const updated = prev.map((p) => (p.id === parcela.id ? updatedParcela : p))
          saveParcelasToStorage(updated)
          return updated
        })

        const nroRecibo = datos?.nroRecibo || `REC-${parcela.nomenclatura}-${Date.now().toString().slice(-6)}`

        const nuevoPago: PagoRecibo = {
          id: `pago-${Date.now()}`,
          concepto,
          monto: montoCobrado,
          identificador: parcela.nomenclatura,
          titularNombre,
          metodo: (datos?.metodo as any) || 'transferencia_qr',
          fecha: new Date().toISOString(),
          nroRecibo,
          comprobante: datos?.comprobante || '7849',
        }

        savePagoToStorage(nuevoPago)
        setPagos((prev) => [nuevoPago, ...prev])
        setRecaudacionHoy((prev) => prev + montoCobrado)

        // Supabase Cloud Sync
        if (isSupabaseConfigured) {
          await Promise.all([
            upsertParcelaSupabase(updatedParcela),
            registrarPagoSupabase(nuevoPago),
          ])
          await fetchCloudData()
        }
      },
    })
  }

  const handleCobrarAfiliado = (afiliado: AfiliadoSeguro, nroCuota: number) => {
    const mesNombre =
      ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][
        nroCuota - 1
      ] || `Mes ${nroCuota}`
    const monto = afiliado.monto_cuota_mensual || 18000
    const concepto = `Plan Seguro Integral - Cuota ${mesNombre} 2026 (#${afiliado.numero_afiliado})`
    const nroRecibo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`

    setQrModal({
      isOpen: true,
      concepto,
      monto,
      identificador: `AFI-${afiliado.numero_afiliado}-${mesNombre}`,
      titularNombre: afiliado.nombre_completo,
      onConfirm: async () => {
        const currentPaid = afiliado.cuotasPagadas || []
        const updatedPaid = currentPaid.includes(nroCuota)
          ? currentPaid
          : [...currentPaid, nroCuota]
        const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))

        const currentDetalles = afiliado.cuotasDetalle || []
        const updatedDetalles = [
          ...currentDetalles.filter((c) => c.mes !== nroCuota && (c as any).nro_cuota !== nroCuota),
          {
            id: `cuota-${afiliado.id}-${nroCuota}`,
            afiliado_id: afiliado.id,
            anio: 2026,
            nro_cuota: nroCuota,
            mes: nroCuota,
            monto,
            estado: 'pagada' as any,
            estado_cuota: 'pagada',
            fecha_pago: new Date().toISOString(),
            metodo_pago: 'transferencia_qr' as const,
            nro_recibo: nroRecibo,
          },
        ]

        const updatedAfiliado: AfiliadoSeguro = {
          ...afiliado,
          cuotasPagadas: updatedPaid,
          cuotasDetalle: updatedDetalles,
          estado: alDia ? 'activo' : afiliado.estado,
        }

        setAfiliados((prev) => {
          const updatedAfiliadosList = prev.map((a) => (a.id === afiliado.id ? updatedAfiliado : a))
          saveAfiliadosToStorage(updatedAfiliadosList)
          return updatedAfiliadosList
        })

        const nuevoPago: PagoRecibo = {
          id: `pago-${Date.now()}`,
          concepto,
          monto,
          identificador: `AFI-${afiliado.numero_afiliado}-${mesNombre}`,
          titularNombre: afiliado.nombre_completo,
          metodo: 'transferencia_qr',
          fecha: new Date().toISOString(),
          nroRecibo,
        }

        savePagoToStorage(nuevoPago)
        setPagos((prev) => [nuevoPago, ...prev])
        setRecaudacionHoy((prev) => prev + monto)

        // Supabase Cloud Sync
        if (isSupabaseConfigured) {
          await Promise.all([
            upsertAfiliadoSupabase(updatedAfiliado),
            registrarPagoCuotaSupabase(afiliado.id, 2026, nroCuota, {
              nroRecibo,
              metodoPago: 'transferencia_qr',
              monto,
            }),
            registrarPagoSupabase(nuevoPago),
          ])
          await fetchCloudData()
        }
      },
    })
  }

  const handleCobrarMultiplesCuotas = (afiliado: AfiliadoSeguro, nrosCuotas: number[]) => {
    const mesesNombres = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ]
    const nombresStr = nrosCuotas.map((n) => mesesNombres[n - 1]).join(', ')
    const valorUnitario = afiliado.monto_cuota_mensual || 18000
    const montoTotal = valorUnitario * nrosCuotas.length
    const concepto = `Plan Seguro Integral - Mora Total (${nombresStr} 2026) (#${afiliado.numero_afiliado})`
    const nroRecibo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`

    setQrModal({
      isOpen: true,
      concepto,
      monto: montoTotal,
      identificador: `AFI-${afiliado.numero_afiliado}-MORA`,
      titularNombre: afiliado.nombre_completo,
      onConfirm: async () => {
        const currentPaid = afiliado.cuotasPagadas || []
        const updatedPaid = Array.from(new Set([...currentPaid, ...nrosCuotas]))
        const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))

        const currentDetalles = afiliado.cuotasDetalle || []
        const newDetalles = nrosCuotas.map((m) => ({
          id: `cuota-${afiliado.id}-${m}`,
          afiliado_id: afiliado.id,
          anio: 2026,
          nro_cuota: m,
          mes: m,
          monto: valorUnitario,
          estado: 'pagada' as any,
          estado_cuota: 'pagada',
          fecha_pago: new Date().toISOString(),
          metodo_pago: 'transferencia_qr' as const,
          nro_recibo: `${nroRecibo}-M${m}`,
        }))

        const updatedAfiliado: AfiliadoSeguro = {
          ...afiliado,
          cuotasPagadas: updatedPaid,
          cuotasDetalle: [
            ...currentDetalles.filter((c) => !nrosCuotas.includes(c.mes || (c as any).nro_cuota)),
            ...newDetalles,
          ],
          estado: alDia ? 'activo' : afiliado.estado,
        }

        setAfiliados((prev) => {
          const updatedAfiliadosList = prev.map((a) => (a.id === afiliado.id ? updatedAfiliado : a))
          saveAfiliadosToStorage(updatedAfiliadosList)
          return updatedAfiliadosList
        })

        const nuevoPago: PagoRecibo = {
          id: `pago-${Date.now()}`,
          concepto,
          monto: montoTotal,
          identificador: `AFI-${afiliado.numero_afiliado}-MORA`,
          titularNombre: afiliado.nombre_completo,
          metodo: 'transferencia_qr',
          fecha: new Date().toISOString(),
          nroRecibo,
        }

        savePagoToStorage(nuevoPago)
        setPagos((prev) => [nuevoPago, ...prev])
        setRecaudacionHoy((prev) => prev + montoTotal)

        // Supabase Cloud Sync
        if (isSupabaseConfigured) {
          const promises: Promise<any>[] = [
            upsertAfiliadoSupabase(updatedAfiliado),
            registrarPagoSupabase(nuevoPago),
          ]
          for (const m of nrosCuotas) {
            promises.push(
              registrarPagoCuotaSupabase(afiliado.id, 2026, m, {
                nroRecibo: `${nroRecibo}-M${m}`,
                metodoPago: 'transferencia_qr',
                monto: valorUnitario,
              })
            )
          }
          await Promise.all(promises)
          await fetchCloudData()
        }
      },
    })
  }

  const handleRevertirCuotaAfiliado = async (afiliadoId: string, nroCuota: number) => {
    const targetAfiliado = afiliados.find((a) => a.id === afiliadoId)
    if (!targetAfiliado) return

    const currentPaid = targetAfiliado.cuotasPagadas || []
    const updatedPaid = currentPaid.filter((m) => m !== nroCuota)
    const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))
    const currentDetalles = targetAfiliado.cuotasDetalle || []

    const updatedAfiliado: AfiliadoSeguro = {
      ...targetAfiliado,
      cuotasPagadas: updatedPaid,
      cuotasDetalle: currentDetalles.filter(
        (c) => c.mes !== nroCuota && (c as any).nro_cuota !== nroCuota
      ),
      estado: alDia ? 'activo' : 'en_mora',
    }

    setAfiliados((prev) => {
      const updatedAfiliadosList = prev.map((a) => (a.id === afiliadoId ? updatedAfiliado : a))
      saveAfiliadosToStorage(updatedAfiliadosList)
      return updatedAfiliadosList
    })

    if (isSupabaseConfigured) {
      await Promise.all([
        revertirPagoCuotaSupabase(afiliadoId, 2026, nroCuota),
        upsertAfiliadoSupabase(updatedAfiliado),
      ])
      await fetchCloudData()
    }
  }

  const handleRegistrarEgreso = async (datos: {
    concepto: string
    categoria: string
    monto: number
    comprobante: string
    metodo: 'efectivo' | 'transferencia'
  }) => {
    const nuevoEgreso: PagoRecibo = {
      id: `egr-${Date.now()}`,
      nroRecibo: datos.comprobante || `EGR-${Date.now().toString().slice(-6)}`,
      identificador: 'EGRESO',
      titularNombre: 'Egreso Operativo',
      concepto: `[EGRESO] (${datos.categoria}) ${datos.concepto}`,
      monto: Number(datos.monto),
      metodo: datos.metodo === 'transferencia' ? 'transferencia_qr' : 'efectivo',
      fecha: new Date().toISOString(),
      tipo: 'egreso',
      categoria: datos.categoria,
      comprobante: datos.comprobante,
    }

    saveEgresoToStorage(nuevoEgreso)
    setPagos((prev) => [nuevoEgreso, ...prev])

    if (isSupabaseConfigured) {
      await registrarPagoSupabase(nuevoEgreso)
      await fetchCloudData()
    }
  }

  const handleNuevoCobroCaja = async (datos: CobroCajaData) => {
    const nuevoPago: PagoRecibo = {
      id: `pago-${Date.now()}`,
      nroRecibo: datos.nroRecibo || `REC-${Date.now().toString().slice(-6)}`,
      identificador: datos.identificador || 'Caja Central',
      titularNombre: datos.titularNombre || 'Contribuyente General',
      concepto: datos.concepto || 'Cobro General de Servicios',
      monto: Number(datos.monto),
      metodo: datos.metodo === 'transferencia_qr' ? 'transferencia_qr' : 'efectivo',
      fecha: new Date().toISOString(),
      tipo: 'ingreso',
    }

    savePagoToStorage(nuevoPago)
    setPagos((prev) => [nuevoPago, ...prev])

    if (isSupabaseConfigured) {
      await registrarCobroCajaSupabase(nuevoPago)
      await fetchCloudData()
    }
  }

  const handleAnularPago = async (pago: PagoRecibo) => {
    const idToDelete = pago.id || pago.nroRecibo
    deletePagoFromStorage(idToDelete)
    setPagos((prev) => prev.filter((p) => p.id !== pago.id && p.nroRecibo !== pago.nroRecibo))

    if (isSupabaseConfigured) {
      await anularPagoSupabase(idToDelete)
      await fetchCloudData()
    }
  }

  // Guardar Parcela (CRUD: Create / Update)
  const handleSaveParcela = async (datos: Partial<Parcela>) => {
    let parcelaTarget: Parcela | null = null

    if (datos.id) {
      const existing = parcelas.find((p) => p.id === datos.id) || editingParcela
      parcelaTarget = { ...(existing || {}), ...datos } as Parcela
      setParcelas((prev) => {
        const updated = prev.map((p) => (p.id === datos.id ? parcelaTarget! : p))
        saveParcelasToStorage(updated)
        return updated
      })
    } else {
      parcelaTarget = {
        id: `parc-${Date.now()}`,
        nomenclatura: datos.nomenclatura || 'A-01-01',
        sector_id: datos.sector_id || 'A',
        manzana_fila: datos.manzana_fila || '01',
        numero_parcela: datos.numero_parcela ? String(datos.numero_parcela) : '1',
        capacidad_total: datos.capacidad_total || 3,
        espacios_ocupados: datos.espacios_ocupados || 0,
        estado: datos.estado || 'disponible',
        saldo_mantenimiento: datos.saldo_mantenimiento || 0,
        notas: datos.notas || '',
        titular: datos.titular || null,
      }
      setParcelas((prev) => {
        const updated = [parcelaTarget!, ...prev]
        saveParcelasToStorage(updated)
        return updated
      })
    }

    setFormParcelaOpen(false)
    setEditingParcela(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured && parcelaTarget) {
      await upsertParcelaSupabase(parcelaTarget)
      await fetchCloudData()
    }
  }

  // Guardar Inhumación (CRUD: Create / Update)
  const handleSaveInhumacion = async (datos: Partial<Inhumacion>) => {
    let inhumacionTarget: Inhumacion | null = null
    const targetId = editingInhumacion?.id || datos.id
    const isExisting = Boolean(targetId && inhumaciones.some((i) => i.id === targetId))

    if (isExisting) {
      const existing = inhumaciones.find((i) => i.id === targetId)!
      inhumacionTarget = { ...(existing || {}), ...datos } as Inhumacion
      setInhumaciones((prev) => {
        const updated = prev.map((i) => (i.id === targetId ? inhumacionTarget! : i))
        saveInhumacionesToStorage(updated)
        return updated
      })
    } else {
      const newId = datos.id || `inh-${Date.now()}`
      inhumacionTarget = {
        id: newId,
        parcela_id: datos.parcela_id || '',
        nombre_difunto: datos.nombre_difunto || 'Difunto',
        dni_difunto: datos.dni_difunto || null,
        fecha_fallecimiento: datos.fecha_fallecimiento || null,
        fecha_inhumacion: datos.fecha_inhumacion || new Date().toISOString().split('T')[0],
        nivel_posicion: Number(datos.nivel_posicion) || 1,
        es_covid: datos.es_covid || false,
        causa_defuncion: datos.causa_defuncion || 'Causa general',
        empresa_funebrera: datos.empresa_funebrera || 'Aeterna Sepelios',
        observaciones: datos.observaciones || null,
        parcela: datos.parcela as any,
      }
      setInhumaciones((prev) => {
        const updated = [inhumacionTarget!, ...prev]
        saveInhumacionesToStorage(updated)
        return updated
      })

      // Actualizar ocupación de parcela
      const targetParcNom =
        typeof datos.parcela === 'object'
          ? datos.parcela?.nomenclatura
          : datos.parcela
      const targetParcId = datos.parcela_id || (typeof datos.parcela === 'object' ? datos.parcela?.id : null)

      if (targetParcNom || targetParcId) {
        setParcelas((prev) => {
          const updated = prev.map((p) => {
            const matchesNom = Boolean(
              targetParcNom && (
                p.nomenclatura === targetParcNom ||
                p.nomenclatura.replace(/[\s-]/g, '').toUpperCase() === String(targetParcNom).replace(/[\s-]/g, '').toUpperCase()
              )
            )
            const matchesId = Boolean(targetParcId && p.id === targetParcId)
            if (matchesNom || matchesId) {
              return {
                ...p,
                espacios_ocupados: Math.min(p.capacidad_total || 3, (p.espacios_ocupados || 0) + 1),
                estado: 'ocupada' as const,
              }
            }
            return p
          })
          saveParcelasToStorage(updated)
          return updated
        })
      }
    }

    setFormInhumacionOpen(false)
    setEditingInhumacion(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured && inhumacionTarget) {
      if (isExisting) {
        await updateInhumacionSupabase(inhumacionTarget)
      } else {
        await insertInhumacionSupabase(inhumacionTarget)
      }
      await fetchCloudData()
    }
  }

  // Guardar Afiliado (CRUD: Create / Update)
  const handleSaveAfiliado = async (datos: Partial<AfiliadoSeguro>) => {
    let afiliadoTarget: AfiliadoSeguro | null = null

    const targetId = editingAfiliado?.id || datos.id
    const isExisting = Boolean(targetId && afiliados.some((a) => a.id === targetId))

    if (isExisting) {
      const existing = afiliados.find((a) => a.id === targetId)!
      afiliadoTarget = {
        ...existing,
        ...(editingAfiliado || {}),
        ...datos,
        cuotasPagadas: existing?.cuotasPagadas || (editingAfiliado as any)?.cuotasPagadas || [1, 2],
      }
      setAfiliados((prev) => {
        const updated = prev.map((a) => (a.id === targetId ? afiliadoTarget! : a))
        saveAfiliadosToStorage(updated)
        return updated
      })
    } else {
      const maxNum = afiliados.reduce((max, a) => Math.max(max, Number(a.numero_afiliado) || 0), 0)
      afiliadoTarget = {
        id: datos.id || `afi-${Date.now()}`,
        numero_afiliado: Number(datos.numero_afiliado) || maxNum + 1,
        nombre_completo: datos.nombre_completo || 'Nuevo Afiliado',
        direccion_cobro: datos.direccion_cobro || 'Chamical',
        zona_cobro: datos.zona_cobro || 'Zona 1 - Centro',
        monto_cuota_mensual: Number(datos.monto_cuota_mensual) || 18000,
        estado: (datos.estado as any) || 'activo',
        fecha_alta: new Date().toISOString().slice(0, 10),
        cuotasPagadas: [1, 2, 3],
      }
      setAfiliados((prev) => {
        const updated = [afiliadoTarget!, ...prev]
        saveAfiliadosToStorage(updated)
        return updated
      })
    }

    setFormAfiliadoOpen(false)
    setEditingAfiliado(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured && afiliadoTarget) {
      await upsertAfiliadoSupabase(afiliadoTarget)
      await fetchCloudData()
    }
  }

  // Operaciones DELETE (CRUD Completo)
  const handleDeleteParcela = async (parcelaId: string) => {
    const target = parcelas.find((p) => p.id === parcelaId)
    setParcelas((prev) => prev.filter((p) => p.id !== parcelaId))
    if (isSupabaseConfigured && target) {
      await deleteParcelaSupabase(target.nomenclatura || target.id)
      await fetchCloudData()
    }
  }

  const handleDeleteInhumacion = async (inhId: string) => {
    const target = inhumaciones.find((i) => i.id === inhId)
    setInhumaciones((prev) => prev.filter((i) => i.id !== inhId))
    if (isSupabaseConfigured) {
      await deleteInhumacionSupabase(inhId, target)
      await fetchCloudData()
    }
  }

  const handleDeleteAfiliado = async (afiId: string) => {
    const target = afiliados.find((a) => a.id === afiId)
    setAfiliados((prev) => {
      const updated = prev.filter((a) => a.id !== afiId)
      saveAfiliadosToStorage(updated)
      return updated
    })
    if (isSupabaseConfigured && target) {
      await deleteAfiliadoSupabase(target.numero_afiliado || target.id)
      await fetchCloudData()
    }
  }

  const handleSaveConfig = async (nuevaConfig: ConfiguracionCobro) => {
    setConfig(nuevaConfig)
    if (isSupabaseConfigured) {
      await saveConfigSupabase(nuevaConfig)
      await fetchCloudData()
    }
  }

  // Si la URL apunta al portal de pago público (por escaneo de QR con cámara del celular)
  if (isPublicPaymentView) {
    const hash = typeof window !== 'undefined' ? window.location.hash || '' : ''
    const queryIndex = hash.indexOf('?')
    const queryString =
      queryIndex !== -1
        ? hash.slice(queryIndex + 1)
        : typeof window !== 'undefined'
        ? window.location.search.slice(1)
        : ''
    const p = new URLSearchParams(queryString)

    const pagoPublicoData = {
      monto: Number(p.get('monto')) || 36000,
      concepto: p.get('concepto') || 'Mantenimiento Cuatrimestral - Parque Aeterna',
      identificador: p.get('id') || p.get('identificador') || 'REF-GENERAL',
      titularNombre: p.get('titular') || 'Contribuyente',
    }

    return (
      <PortalPagoPublico
        monto={pagoPublicoData.monto}
        concepto={pagoPublicoData.concepto}
        identificador={pagoPublicoData.identificador}
        titularNombre={pagoPublicoData.titularNombre}
        config={config}
        onVolver={() => {
          window.location.hash = ''
          setIsPublicPaymentView(false)
        }}
      />
    )
  }

  // Si no hay usuario autenticado, presentar pantalla de login de usuario único
  if (!currentUser) {
    return (
      <>
        <LoginView onLoginSuccess={(user) => setCurrentUser(user)} />
        <PwaInstallPrompt />
      </>
    )
  }

  return (
    <div className="h-full min-h-screen bg-surface text-on-surface antialiased font-sans flex flex-col">
      {/* Navegación Stitch SideBar & TopBar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSearch={() => setSearchOpen(true)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        onCobroRapidoQR={() => handleCobrarParcela(parcelas[0] || ({} as any))}
        onNuevoRegistro={() => {
          if (currentTab === 'parcelas') {
            setEditingParcela(null)
            setFormParcelaOpen(true)
          } else if (currentTab === 'inhumaciones') {
            setEditingInhumacion(null)
            setFormInhumacionOpen(true)
          } else if (currentTab === 'seguro') {
            setEditingAfiliado(null)
            setFormAfiliadoOpen(true)
          } else {
            setEditingParcela(null)
            setFormParcelaOpen(true)
          }
        }}
        onCierreCaja={() => setCierreCajaOpen(true)}
        isOnline={isSupabaseConfigured}
        currentUser={currentUser}
        onLogout={handleLogout}
        afiliados={afiliados}
        parcelas={parcelas}
        onRefresh={() => fetchCloudData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Canvas Principal */}
      <main
        className={`${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        } transition-all duration-300 fixed inset-x-0 top-14 bottom-14 lg:static lg:min-h-screen lg:pt-14 lg:pb-8 flex flex-col overflow-hidden lg:overflow-visible bg-surface text-on-surface`}
      >
        {/* Encabezado Institucional Oficial para Impresión A4 de Reportes */}
        <div className="hidden print:block px-6 pt-4 pb-4 mb-4 border-b-2 border-slate-900 max-w-[1600px] mx-auto">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700 block">
                MUNICIPALIDAD DEL DEPARTAMENTO GENERAL BELGRANO · LA RIOJA
              </span>
              <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">
                {currentTab === 'dashboard' && 'REPORTE CONSOLIDADO DE GESTIÓN Y RECAUDACIÓN'}
                {currentTab === 'parcelas' && 'PADRÓN GENERAL Y REGISTRO DE PARCELAS'}
                {currentTab === 'inhumaciones' && 'LIBRO OFICIAL DE INHUMACIONES Y REGISTRO DE DIFUNTOS'}
                {currentTab === 'seguro' && 'PADRÓN DE AFILIADOS Y ESTADO DE COBRANZA PLAN SEGURO INTEGRAL'}
                {currentTab === 'caja' && 'LIBRO DIARIO DE CAJA Y ARQUEO DE TESORERÍA'}
                {currentTab === 'configuracion' && 'CONSTANCIA DE PARÁMETROS Y ARANCELES MUNICIPALES'}
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Cementerio Parque Municipal Aeterna · Sistema de Gestión y Fiscalización Mortuoria
              </p>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <span className="block font-bold text-slate-900">
                Fecha: {new Date().toLocaleDateString('es-AR')}
              </span>
              <span className="block text-slate-600">
                Hora: {new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs
              </span>
              <span className="inline-block mt-1 px-2.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-[10px] font-mono font-bold">
                EXPEDIENTE OFICIAL DE REGISTRO
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col px-2 sm:px-4 pt-1 sm:pt-2 pb-1 lg:pb-6 max-w-[1600px] w-full mx-auto overflow-hidden lg:overflow-visible">
          {currentTab === 'dashboard' && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pb-4">
              <DashboardView
              parcelas={parcelas}
              afiliados={afiliados}
              inhumaciones={inhumaciones}
              recaudacionHoy={recaudacionHoy}
              onCobrarQR={handleCobrarParcela}
              onNuevaParcela={() => {
                setEditingParcela(null)
                setFormParcelaOpen(true)
              }}
              onNuevaInhumacion={() => {
                setEditingInhumacion(null)
                setFormInhumacionOpen(true)
              }}
              onNuevoAfiliado={() => {
                setEditingAfiliado(null)
                setFormAfiliadoOpen(true)
              }}
              onVerParcelasMora={() => setCurrentTab('parcelas')}
              onOpenSearch={() => setSearchOpen(true)}
              onSelectTab={setCurrentTab}
              onCierreCaja={() => setCierreCajaOpen(true)}
            />
            </div>
          )}

          {currentTab === 'parcelas' && (
            <ParcelasView
              parcelas={parcelas}
              inhumaciones={inhumaciones}
              onCobrarQR={handleCobrarParcela}
              onSaveParcela={handleSaveParcela}
              onDeleteParcela={handleDeleteParcela}
              onNuevaParcela={() => {
                setEditingParcela(null)
                setFormParcelaOpen(true)
              }}
              onNuevaInhumacionParaParcela={(nom) => {
                setEditingInhumacion({
                  id: '',
                  nombre_difunto: '',
                  parcela: nom,
                  fecha_inhumacion: new Date().toISOString(),
                  nivel_posicion: 2,
                  es_covid: false,
                } as any)
                setFormInhumacionOpen(true)
              }}
              isOnline={isSupabaseConfigured}
              onRefresh={() => fetchCloudData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {currentTab === 'inhumaciones' && (
            <InhumacionesView
              inhumaciones={inhumaciones}
              parcelasDisponibles={parcelas}
              onRegistrarInhumacion={handleSaveInhumacion}
              onEliminarInhumacion={handleDeleteInhumacion}
              onNuevaInhumacion={() => {
                setEditingInhumacion(null)
                setFormInhumacionOpen(true)
              }}
              onVerParcela={(nom) => {
                setCurrentTab('parcelas')
              }}
              onRefresh={() => fetchCloudData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {currentTab === 'seguro' && (
            <AfiliadosSeguroView
              afiliados={afiliados}
              onCobrarCuota={handleCobrarAfiliado}
              onCobrarMultiplesCuotas={handleCobrarMultiplesCuotas}
              onRevertirCuota={handleRevertirCuotaAfiliado}
              onNuevoAfiliado={() => {
                setEditingAfiliado(null)
                setFormAfiliadoOpen(true)
              }}
              onEditarAfiliado={(a) => {
                setEditingAfiliado(a)
                setFormAfiliadoOpen(true)
              }}
              onSaveAfiliado={handleSaveAfiliado}
              onEliminarAfiliado={handleDeleteAfiliado}
              onRefresh={() => fetchCloudData(true)}
              isRefreshing={isRefreshing}
            />
          )}

          {currentTab === 'caja' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto custom-scroll pb-4">
              <CajaView
                pagos={pagos}
                onNuevoCobro={handleNuevoCobroCaja}
                onNuevoEgreso={handleRegistrarEgreso}
                onAnularPago={handleAnularPago}
                onCierreCaja={() => setCierreCajaOpen(true)}
                onRefresh={() => fetchCloudData(true)}
                isRefreshing={isRefreshing}
                isOnline={isSupabaseConfigured}
              />
            </div>
          )}

          {currentTab === 'configuracion' && (
            <div className="flex-1 min-h-0 overflow-y-auto custom-scroll pb-4">
              <ConfiguracionView config={config} onSave={handleSaveConfig} />
            </div>
          )}

          {/* Pie de Firma Institucional para Impresión A4 de Reportes Generales */}
          <div className="hidden print:flex items-end justify-between pt-12 mt-12 border-t border-slate-400 text-xs text-slate-700">
            <div className="text-center w-52">
              <div className="border-b border-slate-900 pb-1 mb-1 font-mono">________________________</div>
              <span className="font-bold block">Firma y Sello de Operador</span>
              <span className="text-[10px] text-slate-500">Mesa de Entrada / Registro Civil</span>
            </div>
            <div className="text-center text-[10px] text-slate-500 max-w-xs">
              Documento emitido bajo Ordenanza Municipal N° 842/2024. Los datos contenidos en este informe
              tienen carácter de declaración jurada y testimonio público oficial.
            </div>
            <div className="text-center w-52">
              <div className="border-b border-slate-900 pb-1 mb-1 font-mono">________________________</div>
              <span className="font-bold block">Dirección de Servicios Públicos</span>
              <span className="text-[10px] text-slate-500">Municipio de Chamical</span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Omnibox Universal (Ctrl+K) */}
      <OmniboxSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        items={searchItems}
        onSelectItem={(item) => {
          if (item.type === 'parcela') {
            setCurrentTab('parcelas')
          } else if (item.type === 'difunto') {
            setCurrentTab('inhumaciones')
          } else if (item.type === 'afiliado') {
            setCurrentTab('seguro')
          }
        }}
      />

      {/* Modal Cierre de Caja */}
      <CierreCajaModal
        isOpen={cierreCajaOpen}
        onClose={() => setCierreCajaOpen(false)}
        totalRecaudado={recaudacionHoy}
        pagos={pagos}
        onRegistrarEgreso={handleRegistrarEgreso}
      />

      {/* Modal de Cobro con Código QR (CBU/Alias) */}
      <QRPaymentModal
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal((prev) => ({ ...prev, isOpen: false }))}
        concepto={qrModal.concepto}
        monto={qrModal.monto}
        identificador={qrModal.identificador}
        titularNombre={qrModal.titularNombre}
        config={config}
        onConfirmarPago={(datos) => {
          qrModal.onConfirm(datos)
        }}
      />

      {/* Modal Formulario Parcela (si se abre flotante) */}
      {formParcelaOpen && (
        <ParcelaForm
          initialData={editingParcela}
          inhumaciones={inhumaciones}
          onSave={handleSaveParcela}
          onCancel={() => {
            setFormParcelaOpen(false)
            setEditingParcela(null)
          }}
          onNuevaInhumacionParaParcela={(nom) => {
            setFormParcelaOpen(false)
            setEditingParcela(null)
            setEditingInhumacion({
              id: '',
              nombre_difunto: '',
              parcela: nom,
              fecha_inhumacion: new Date().toISOString(),
              nivel_posicion: 2,
              es_covid: false,
            } as any)
            setFormInhumacionOpen(true)
          }}
        />
      )}

      {/* Modal Formulario Inhumación */}
      {formInhumacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <InhumacionForm
              parcelasDisponibles={parcelas}
              inhumaciones={inhumaciones}
              initialData={editingInhumacion}
              onSave={handleSaveInhumacion}
              onCancel={() => {
                setFormInhumacionOpen(false)
                setEditingInhumacion(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Formulario Afiliado */}
      {formAfiliadoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <AfiliadoForm
              initialData={editingAfiliado}
              onSave={handleSaveAfiliado}
              onCancel={() => {
                setFormAfiliadoOpen(false)
                setEditingAfiliado(null)
              }}
            />
          </div>
        </div>
      )}

      {/* PWA Install Banner & Prompt (Android / iOS) */}
      <PwaInstallPrompt />
    </div>
  )
}
