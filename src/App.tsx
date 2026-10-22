import React, { useState, useMemo, useEffect } from 'react'
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
import { ConfiguracionView } from './components/views/ConfiguracionView'
import { CierreCajaModal } from './components/modals/CierreCajaModal'
import { Parcela, Inhumacion, AfiliadoSeguro, ConfiguracionCobro } from './types/database'
import { isSupabaseConfigured } from './lib/supabase'
import {
  loadInitialData,
  saveConfigToStorage,
  saveParcelasToStorage,
  saveInhumacionesToStorage,
  saveAfiliadosToStorage,
  savePagoToStorage,
  fetchConfigSupabase,
  saveConfigSupabase,
  fetchParcelasSupabase,
  fetchInhumacionesSupabase,
  fetchAfiliadosSupabase,
  upsertParcelaSupabase,
  deleteParcelaSupabase,
  insertInhumacionSupabase,
  deleteInhumacionSupabase,
  upsertAfiliadoSupabase,
  deleteAfiliadoSupabase,
  registrarPagoCuotaSupabase,
  revertirPagoCuotaSupabase,
  registrarPagoSupabase,
  PagoRecibo,
} from './services/dataService'

export default function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard')
  const [searchOpen, setSearchOpen] = useState(false)
  const [cierreCajaOpen, setCierreCajaOpen] = useState(false)

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

  // Sincronización en vivo desde Supabase si está configurado
  useEffect(() => {
    if (!isSupabaseConfigured) return

    async function fetchCloudData() {
      const [cloudConfig, cloudParcelas, cloudInhumaciones, cloudAfiliados] = await Promise.all([
        fetchConfigSupabase(),
        fetchParcelasSupabase(),
        fetchInhumacionesSupabase(),
        fetchAfiliadosSupabase(),
      ])

      if (cloudConfig) {
        setConfig(cloudConfig)
      }
      if (cloudParcelas && cloudParcelas.length > 0) {
        setParcelas(cloudParcelas)
      }
      if (cloudInhumaciones && cloudInhumaciones.length > 0) {
        setInhumaciones(cloudInhumaciones)
      }
      if (cloudAfiliados && cloudAfiliados.length > 0) {
        setAfiliados(cloudAfiliados)
      }
    }

    fetchCloudData()
  }, [])

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
    onConfirm: () => void
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
      list.push({
        id: p.id,
        title: `Parcela ${p.nomenclatura}`,
        subtitle: p.titular
          ? `Titular: ${p.titular.nombre_completo} (${p.titular.direccion || 'Chamical'})`
          : 'Sin titular asignado',
        type: 'parcela',
        badge: p.estado === 'en_mora' ? 'En Mora' : p.estado.toUpperCase(),
        item: p,
      })
    }

    for (const inh of inhumaciones) {
      const pNom = typeof inh.parcela === 'object' ? inh.parcela?.nomenclatura : inh.parcela
      list.push({
        id: inh.id,
        title: inh.nombre_difunto,
        subtitle: `Inhumado el ${inh.fecha_inhumacion?.slice(0, 10)} - Parcela: ${pNom || 'S/D'}`,
        type: 'difunto',
        badge: inh.es_covid ? 'COVID-19' : 'Ordinario',
        item: inh,
      })
    }

    for (const a of afiliados) {
      list.push({
        id: a.id,
        title: `${a.nombre_completo} (#${a.numero_afiliado})`,
        subtitle: `${a.direccion_cobro || 'Chamical'} - ${a.zona_cobro || 'Zona 1'}`,
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
      onConfirm: async () => {
        const updatedParcela: Parcela = {
          ...parcela,
          saldo_mantenimiento: 0,
          estado: parcela.estado === 'en_mora' ? 'ocupada' : parcela.estado,
        }

        setParcelas((prev) =>
          prev.map((p) => (p.id === parcela.id ? updatedParcela : p))
        )

        const nuevoPago: PagoRecibo = {
          id: `pago-${Date.now()}`,
          concepto,
          monto,
          identificador: parcela.nomenclatura,
          titularNombre,
          metodo: 'transferencia_qr',
          fecha: new Date().toISOString(),
          nroRecibo: `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        }

        savePagoToStorage(nuevoPago)
        setPagos((prev) => [nuevoPago, ...prev])
        setRecaudacionHoy((prev) => prev + monto)

        // Supabase Cloud Sync
        if (isSupabaseConfigured) {
          await Promise.all([
            upsertParcelaSupabase(updatedParcela),
            registrarPagoSupabase(nuevoPago),
          ])
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
    const concepto = `Seguro Sepelio - Cuota ${mesNombre} 2026 (#${afiliado.numero_afiliado})`
    const nroRecibo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`

    setQrModal({
      isOpen: true,
      concepto,
      monto,
      identificador: `AFI-${afiliado.numero_afiliado}-${mesNombre}`,
      titularNombre: afiliado.nombre_completo,
      onConfirm: async () => {
        let updatedAfiliadosList: AfiliadoSeguro[] = []
        let updatedAfiliado: any = null

        setAfiliados((prev) => {
          updatedAfiliadosList = prev.map((a) => {
            if (a.id === afiliado.id) {
              const currentPaid = a.cuotasPagadas || []
              const updatedPaid = currentPaid.includes(nroCuota)
                ? currentPaid
                : [...currentPaid, nroCuota]
              const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))

              const currentDetalles = a.cuotasDetalle || []
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
                  metodo_pago: 'transferencia_qr',
                  nro_recibo: nroRecibo,
                },
              ]

              updatedAfiliado = {
                ...a,
                cuotasPagadas: updatedPaid,
                cuotasDetalle: updatedDetalles,
                estado: alDia ? 'activo' : a.estado,
              }
              return updatedAfiliado
            }
            return a
          })
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
        if (isSupabaseConfigured && updatedAfiliado) {
          await Promise.all([
            upsertAfiliadoSupabase(updatedAfiliado),
            registrarPagoCuotaSupabase(afiliado.id, 2026, nroCuota, {
              nroRecibo,
              metodoPago: 'transferencia_qr',
              monto,
            }),
            registrarPagoSupabase(nuevoPago),
          ])
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
    const concepto = `Seguro Sepelio - Mora Total (${nombresStr} 2026) (#${afiliado.numero_afiliado})`
    const nroRecibo = `REC-2026-${Math.floor(1000 + Math.random() * 9000)}`

    setQrModal({
      isOpen: true,
      concepto,
      monto: montoTotal,
      identificador: `AFI-${afiliado.numero_afiliado}-MORA`,
      titularNombre: afiliado.nombre_completo,
      onConfirm: async () => {
        let updatedAfiliadosList: AfiliadoSeguro[] = []
        let updatedAfiliado: any = null

        setAfiliados((prev) => {
          updatedAfiliadosList = prev.map((a) => {
            if (a.id === afiliado.id) {
              const currentPaid = a.cuotasPagadas || []
              const updatedPaid = Array.from(new Set([...currentPaid, ...nrosCuotas]))
              const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))

              const currentDetalles = a.cuotasDetalle || []
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
                metodo_pago: 'transferencia_qr',
                nro_recibo: `${nroRecibo}-M${m}`,
              }))

              updatedAfiliado = {
                ...a,
                cuotasPagadas: updatedPaid,
                cuotasDetalle: [
                  ...currentDetalles.filter((c) => !nrosCuotas.includes(c.mes || (c as any).nro_cuota)),
                  ...newDetalles,
                ],
                estado: alDia ? 'activo' : a.estado,
              }
              return updatedAfiliado
            }
            return a
          })
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
        if (isSupabaseConfigured && updatedAfiliado) {
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
        }
      },
    })
  }

  const handleRevertirCuotaAfiliado = async (afiliadoId: string, nroCuota: number) => {
    let updatedAfiliadosList: AfiliadoSeguro[] = []
    let updatedAfiliado: any = null

    setAfiliados((prev) => {
      updatedAfiliadosList = prev.map((a) => {
        if (a.id === afiliadoId) {
          const currentPaid = a.cuotasPagadas || []
          const updatedPaid = currentPaid.filter((m) => m !== nroCuota)
          const alDia = [1, 2, 3].every((m) => updatedPaid.includes(m))
          const currentDetalles = a.cuotasDetalle || []

          updatedAfiliado = {
            ...a,
            cuotasPagadas: updatedPaid,
            cuotasDetalle: currentDetalles.filter(
              (c) => c.mes !== nroCuota && (c as any).nro_cuota !== nroCuota
            ),
            estado: alDia ? 'activo' : 'inactivo',
          }
          return updatedAfiliado
        }
        return a
      })
      saveAfiliadosToStorage(updatedAfiliadosList)
      return updatedAfiliadosList
    })

    if (isSupabaseConfigured) {
      await Promise.all([
        revertirPagoCuotaSupabase(afiliadoId, 2026, nroCuota),
        updatedAfiliado ? upsertAfiliadoSupabase(updatedAfiliado) : Promise.resolve(true),
      ])
    }
  }

  // Guardar Parcela (CRUD: Create / Update)
  const handleSaveParcela = async (datos: Partial<Parcela>) => {
    let parcelaTarget: Parcela

    if (datos.id) {
      parcelaTarget = { ...editingParcela, ...datos } as Parcela
      setParcelas((prev) =>
        prev.map((p) => (p.id === datos.id ? parcelaTarget : p))
      )
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
      setParcelas((prev) => [parcelaTarget, ...prev])
    }

    setFormParcelaOpen(false)
    setEditingParcela(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured) {
      await upsertParcelaSupabase(parcelaTarget)
    }
  }

  // Guardar Inhumación (CRUD: Create)
  const handleSaveInhumacion = async (datos: Partial<Inhumacion>) => {
    let inhumacionTarget: Inhumacion

    if (editingInhumacion) {
      inhumacionTarget = { ...editingInhumacion, ...datos } as Inhumacion
      setInhumaciones((prev) =>
        prev.map((i) => (i.id === editingInhumacion.id ? inhumacionTarget : i))
      )
    } else {
      inhumacionTarget = {
        id: `inh-${Date.now()}`,
        parcela_id: datos.parcela_id || 'parc-1',
        nombre_difunto: datos.nombre_difunto || 'Difunto',
        fecha_inhumacion: datos.fecha_inhumacion || new Date().toISOString(),
        nivel_posicion: datos.nivel_posicion || 1,
        es_covid: datos.es_covid || false,
        causa_defuncion: datos.causa_defuncion || 'Causa general',
        empresa_funebrera: datos.empresa_funebrera || 'Aeterna Sepelios',
        parcela: datos.parcela as any,
      }
      setInhumaciones((prev) => [inhumacionTarget, ...prev])

      // Actualizar ocupación de parcela
      if (datos.parcela?.nomenclatura) {
        setParcelas((prev) =>
          prev.map((p) => {
            if (p.nomenclatura === datos.parcela?.nomenclatura) {
              return {
                ...p,
                espacios_ocupados: Math.min(p.capacidad_total, p.espacios_ocupados + 1),
                estado: 'ocupada',
              }
            }
            return p
          })
        )
      }
    }

    setFormInhumacionOpen(false)
    setEditingInhumacion(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured) {
      await insertInhumacionSupabase(inhumacionTarget)
    }
  }

  // Guardar Afiliado (CRUD: Create / Update)
  const handleSaveAfiliado = async (datos: Partial<AfiliadoSeguro>) => {
    let afiliadoTarget: any

    if (editingAfiliado) {
      afiliadoTarget = {
        ...editingAfiliado,
        ...datos,
        cuotasPagadas: (editingAfiliado as any).cuotasPagadas || [1, 2],
      }
      setAfiliados((prev) => {
        const updated = prev.map((a) => (a.id === editingAfiliado.id ? afiliadoTarget : a))
        saveAfiliadosToStorage(updated)
        return updated
      })
    } else {
      afiliadoTarget = {
        id: `afi-${Date.now()}`,
        numero_afiliado: datos.numero_afiliado || afiliados.length + 1,
        nombre_completo: datos.nombre_completo || 'Nuevo Afiliado',
        direccion_cobro: datos.direccion_cobro || 'Chamical',
        zona_cobro: datos.zona_cobro || 'Zona 1 - Centro',
        monto_cuota_mensual: datos.monto_cuota_mensual || 18000,
        estado: datos.estado || 'activo',
        fecha_alta: new Date().toISOString().slice(0, 10),
        cuotasPagadas: [1, 2, 3],
      }
      setAfiliados((prev) => {
        const updated = [afiliadoTarget, ...prev]
        saveAfiliadosToStorage(updated)
        return updated
      })
    }

    setFormAfiliadoOpen(false)
    setEditingAfiliado(null)

    // Supabase Cloud Sync
    if (isSupabaseConfigured) {
      await upsertAfiliadoSupabase(afiliadoTarget)
    }
  }

  // Operaciones DELETE (CRUD Completo)
  const handleDeleteParcela = async (parcelaId: string) => {
    const target = parcelas.find((p) => p.id === parcelaId)
    setParcelas((prev) => prev.filter((p) => p.id !== parcelaId))
    if (isSupabaseConfigured && target) {
      await deleteParcelaSupabase(target.nomenclatura || target.id)
    }
  }

  const handleDeleteInhumacion = async (inhId: string) => {
    setInhumaciones((prev) => prev.filter((i) => i.id !== inhId))
    if (isSupabaseConfigured) {
      await deleteInhumacionSupabase(inhId)
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
    }
  }

  const handleSaveConfig = async (nuevaConfig: ConfiguracionCobro) => {
    setConfig(nuevaConfig)
    if (isSupabaseConfigured) {
      await saveConfigSupabase(nuevaConfig)
    }
  }

  return (
    <div className="h-full min-h-screen bg-surface text-on-surface antialiased font-sans flex flex-col">
      {/* Navegación Stitch SideBar & TopBar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenSearch={() => setSearchOpen(true)}
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
      />

      {/* Canvas Principal */}
      <main className="lg:ml-64 pt-14 min-h-screen pb-20 lg:pb-8 bg-surface text-on-surface">
        <div className="px-2.5 py-4 sm:p-6 max-w-[1600px] w-full mx-auto space-y-6">
          {currentTab === 'dashboard' && (
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
            />
          )}

          {currentTab === 'parcelas' && (
            <ParcelasView
              parcelas={parcelas}
              inhumaciones={inhumaciones}
              onCobrarQR={handleCobrarParcela}
              onSaveParcela={handleSaveParcela}
              onDeleteParcela={handleDeleteParcela}
              onNuevaInhumacionParaParcela={(nom) => {
                setEditingInhumacion({
                  id: '',
                  nombre_difunto: '',
                  parcela: nom,
                  fecha_inhumacion: new Date().toISOString(),
                  nivel_posicion: 2,
                  es_covid: false,
                } as any)
                setCurrentTab('inhumaciones')
              }}
              isOnline={isSupabaseConfigured}
            />
          )}

          {currentTab === 'inhumaciones' && (
            <InhumacionesView
              inhumaciones={inhumaciones}
              parcelasDisponibles={parcelas}
              onRegistrarInhumacion={handleSaveInhumacion}
              onEliminarInhumacion={handleDeleteInhumacion}
              onVerParcelaEnCatastro={(nom) => {
                setCurrentTab('parcelas')
              }}
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
              onEliminarAfiliado={handleDeleteAfiliado}
            />
          )}

          {currentTab === 'configuracion' && (
            <ConfiguracionView config={config} onSave={handleSaveConfig} />
          )}
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
        onConfirmarPago={() => {
          qrModal.onConfirm()
        }}
      />

      {/* Modal Formulario Parcela (si se abre flotante) */}
      {formParcelaOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <ParcelaForm
              initialData={editingParcela}
              onSave={handleSaveParcela}
              onCancel={() => {
                setFormParcelaOpen(false)
                setEditingParcela(null)
              }}
            />
          </div>
        </div>
      )}

      {/* Modal Formulario Inhumación */}
      {formInhumacionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <InhumacionForm
              parcelasDisponibles={parcelas}
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
    </div>
  )
}
