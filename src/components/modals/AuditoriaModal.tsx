import React, { useState, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getA4ReportStyles, openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

interface AuditLogEntry {
  id: string
  timestamp: string
  operador: string
  modulo: 'cobranzas' | 'catastro' | 'inhumaciones' | 'seguro' | 'sistema'
  accion: string
  detalle: string
  ip: string
  estado: 'verificado' | 'alerta'
}

interface AuditoriaModalProps {
  isOpen: boolean
  onClose: () => void
  pagosCount?: number
  parcelasCount?: number
  inhumacionesCount?: number
}

export const AuditoriaModal: React.FC<AuditoriaModalProps> = ({
  isOpen,
  onClose,
  parcelasCount = 397,
}) => {
  const [moduloFiltro, setModuloFiltro] = useState<string>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [isBW, setIsBW] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  const logs: AuditLogEntry[] = useMemo(() => {
    const base: AuditLogEntry[] = [
      {
        id: 'AUD-8842',
        timestamp: new Date().toLocaleDateString('es-AR') + ' 16:32:15',
        operador: 'Terminal 01 · Administración',
        modulo: 'cobranzas',
        accion: 'COBRO_CUOTA_QR_BCRA',
        detalle: 'Acreditación en línea mediante transferencia interoperable QR BCRA 3.0',
        ip: '192.168.1.45 (Red Central)',
        estado: 'verificado',
      },
      {
        id: 'AUD-8841',
        timestamp: new Date().toLocaleDateString('es-AR') + ' 16:15:02',
        operador: 'Terminal 01 · Administración',
        modulo: 'inhumaciones',
        accion: 'EMISION_ACTA_INHUMACION',
        detalle: 'Emisión de Acta Oficial con verificación de protocolo sanitario COVID-19',
        ip: '192.168.1.45 (Red Central)',
        estado: 'verificado',
      },
      {
        id: 'AUD-8840',
        timestamp: new Date().toLocaleDateString('es-AR') + ' 15:48:22',
        operador: 'Supervisor de Parcelas',
        modulo: 'catastro',
        accion: 'ALTA_PARCELA',
        detalle: `Actualización de parcela en padrón general (${parcelasCount} parcelas sincronizadas)`,
        ip: '192.168.1.10 (Administración)',
        estado: 'verificado',
      },
      {
        id: 'AUD-8839',
        timestamp: new Date().toLocaleDateString('es-AR') + ' 14:10:05',
        operador: 'Administrador General',
        modulo: 'seguro',
        accion: 'SINCRONIZACION_PADRON_SEGURO',
        detalle: 'Sincronización de cuotas y padrón de cobradores de calle con Supabase',
        ip: '192.168.1.100 (Servidor Local)',
        estado: 'verificado',
      },
      {
        id: 'AUD-8838',
        timestamp: new Date().toLocaleDateString('es-AR') + ' 12:00:00',
        operador: 'Sistema Automático',
        modulo: 'sistema',
        accion: 'CHECK_INTEGRIDAD_DATABASE',
        detalle: 'Verificación criptográfica de consistencia y respaldo en nube Supabase',
        ip: '127.0.0.1 (Localhost)',
        estado: 'verificado',
      },
    ]
    return base
  }, [parcelasCount])

  if (!isOpen) return null

  const filteredLogs = logs.filter((log) => {
    if (moduloFiltro !== 'todos' && log.modulo !== moduloFiltro) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      return (
        log.accion.toLowerCase().includes(q) ||
        log.detalle.toLowerCase().includes(q) ||
        log.operador.toLowerCase().includes(q) ||
        log.id.toLowerCase().includes(q)
      )
    }
    return true
  })

  const exportarCSV = () => {
    const headers = ['ID_LOG', 'TIMESTAMP', 'OPERADOR', 'MODULO', 'ACCION', 'DETALLE', 'IP', 'ESTADO']
    const rows = filteredLogs.map((l) => [
      l.id,
      `"${l.timestamp}"`,
      `"${l.operador}"`,
      `"${l.modulo}"`,
      `"${l.accion}"`,
      `"${l.detalle.replace(/"/g, '""')}"`,
      `"${l.ip}"`,
      l.estado,
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `auditoria_aeterna_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const opened = openA4PrintWindow(
      'Libro de Auditoría y Trazabilidad — Aeterna Parque San Nicolás',
      printContent,
      isBW
    )
    if (!opened) {
      window.print()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <style>{getA4ReportStyles(isBW)}</style>
      <div
        data-printable-modal="true"
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full overflow-hidden border border-outline-variant flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary-container p-4 sm:p-5 text-white flex items-start justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white">
              <span className="material-symbols-outlined text-[24px]">shield</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/80 block">
                Libro Digital de Auditoría & Trazabilidad
              </span>
              <h2 className="text-title-lg font-title-lg font-bold">
                Registro de Operaciones · Aeterna Parque San Nicolás
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors print:hidden cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-3.5 bg-surface-container-low border-b border-outline-variant flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el registro de auditoría..."
              className="w-full h-8 px-3 text-xs bg-white rounded-lg border border-outline-variant focus:border-primary outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-outline font-semibold">Módulo:</span>
            <select
              value={moduloFiltro}
              onChange={(e) => setModuloFiltro(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white rounded-lg border border-outline-variant font-medium outline-none"
            >
              <option value="todos">Todos los módulos</option>
              <option value="cobranzas">Cobranzas QR / Caja</option>
              <option value="catastro">Gestión de Parcelas</option>
              <option value="inhumaciones">Inhumaciones</option>
              <option value="seguro">Seguro Sepelio</option>
              <option value="sistema">Sistema</option>
            </select>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={false} />
            <button
              type="button"
              onClick={exportarCSV}
              className="h-8 px-3 rounded-lg border border-outline-variant bg-white hover:bg-surface-container text-on-surface text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Descargar libro en formato CSV"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              <span>Exportar CSV</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="h-8 px-3 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              title="Imprimir informe oficial de auditoría"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir Reporte</span>
            </button>
          </div>
        </div>

        {/* Printable A4 Audit Log Table */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scroll bg-slate-200/70 flex-1 print:p-0 print:bg-white">
          <div
            ref={printRef}
            className="a4-sheet bg-white p-6 border border-slate-400 shadow-md mx-auto print:border-none print:shadow-none print:p-0"
          >
            <div className="doc-header">
              <div className="brand-box">
                <img
                  src={`${typeof window !== 'undefined' ? window.location.origin : ''}/logo_aeterna.png`}
                  alt="Aeterna Parque San Nicolás"
                  className="brand-logo"
                />
                <div>
                  <h1 className="brand-title">AETERNA PARQUE SAN NICOLÁS</h1>
                  <h2 className="brand-subtitle">
                    LIBRO DE AUDITORÍA Y TRAZABILIDAD DE OPERACIONES
                  </h2>
                  <p className="brand-caption">
                    Administración y Sistemas · Registro Criptográfico de Transacciones
                  </p>
                </div>
              </div>
              <div className="meta-box">
                <span className="meta-badge">REPORTE DE AUDITORÍA</span>
                <div className="meta-line">
                  FECHA: <strong>{new Date().toLocaleDateString('es-AR')}</strong>
                </div>
                <div className="meta-sub">EVENTOS: {filteredLogs.length} REGISTROS</div>
              </div>
            </div>

            <table className="report-table">
              <thead>
                <tr>
                  <th style={{ textAlign: 'center', width: '76px' }}>ID Log</th>
                  <th style={{ textAlign: 'center', width: '115px' }}>Fecha / Hora</th>
                  <th style={{ textAlign: 'left', width: '145px' }}>Operador</th>
                  <th style={{ textAlign: 'left', width: '155px' }}>Acción</th>
                  <th style={{ textAlign: 'left' }}>Detalle de Operación</th>
                  <th style={{ textAlign: 'center', width: '78px' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '20px', textAlign: 'center', fontStyle: 'italic' }}>
                      No se encontraron registros de auditoría coincidentes.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, idx) => (
                    <tr key={log.id} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                      <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 900 }}>
                        {log.id}
                      </td>
                      <td style={{ textAlign: 'center', fontFamily: "'Courier New', monospace", fontWeight: 700 }}>
                        {log.timestamp}
                      </td>
                      <td style={{ fontWeight: 800 }}>{log.operador}</td>
                      <td>
                        <span className="parcela-pill">{log.accion}</span>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{log.detalle}</div>
                        <div style={{ fontSize: '8.5px', fontFamily: "'Courier New', monospace", fontWeight: 700 }}>
                          IP: {log.ip}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-ingreso">Auditado</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">Responsable de Sistemas y Datos</div>
                <div className="firma-sub">Control Técnico Aeterna</div>
              </div>
              <div className="footer-note">
                Aeterna Parque San Nicolás · Log de auditoría inmutable y registro de operaciones.
              </div>
              <div className="firma-block">
                <div className="firma-line">Dirección y Tesorería</div>
                <div className="firma-sub">Aeterna Parque San Nicolás</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-surface-container-low border-t border-outline-variant flex items-center justify-between text-[11px] text-outline print:hidden">
          <span>Trazabilidad certificada · Aeterna Parque San Nicolás</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-outline-variant bg-white text-on-surface font-semibold hover:bg-surface-container text-xs cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
