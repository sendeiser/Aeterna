import React, { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Inhumacion } from '../../types/database'
import { getA4ReportStyles, openA4PrintWindow, ReportModeToggle } from '../../lib/reportPrintHelper'

interface ActaInhumacionModalProps {
  isOpen: boolean
  onClose: () => void
  inhumacion: Inhumacion | null
  folioNumber: number
}

export const ActaInhumacionModal: React.FC<ActaInhumacionModalProps> = ({
  isOpen,
  onClose,
  inhumacion,
  folioNumber,
}) => {
  const [isBW, setIsBW] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !inhumacion) return null

  const parcNom =
    typeof inhumacion.parcela === 'object'
      ? inhumacion.parcela?.nomenclatura
      : inhumacion.parcela || 'S/D'

  const fechaInh = inhumacion.fecha_inhumacion
    ? new Date(inhumacion.fecha_inhumacion).toLocaleDateString('es-AR')
    : 'S/D'
  const horaInh = inhumacion.fecha_inhumacion?.slice(11, 16) || '10:00'

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML || ''
    const opened = openA4PrintWindow(
      `Acta de Inhumación Folio #${folioNumber} — ${inhumacion.nombre_difunto}`,
      printContent,
      isBW
    )
    if (!opened) {
      window.print()
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <style>{getA4ReportStyles(isBW)}</style>
      <div
        data-printable-modal="true"
        className="bg-surface-container-lowest border border-outline-variant w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 border-b border-outline-variant bg-surface-container-low print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">description</span>
            <span className="font-bold text-sm text-primary uppercase tracking-wide">
              Acta Oficial de Inhumación & Registro Sanitario
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ReportModeToggle isBW={isBW} onChange={setIsBW} darkBg={false} />
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 h-8 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir Constancia</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Certificate Body */}
        <div className="p-5 sm:p-6 overflow-y-auto custom-scroll bg-slate-200/70 flex-1 print:p-0 print:bg-white print:overflow-visible">
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
                    ACTA OFICIAL DE INHUMACIÓN Y REGISTRO SANITARIO
                  </h2>
                  <p className="brand-caption">
                    Registro Catastral y Libro Digital de Sepulturas · Ley Sanitaria N° 4.120
                  </p>
                </div>
              </div>

              <div className="meta-box">
                <span className="meta-badge">ACTA / FOLIO N° {folioNumber}</span>
                <div className="meta-line">TOMO XXXII · EJERCICIO 2026</div>
                <div className="meta-sub">FECHA SEPULTURA: {fechaInh}</div>
              </div>
            </div>

            {/* Tabla de Datos del Acta con Bordes Marcados */}
            <table className="report-table" style={{ marginBottom: '14px' }}>
              <thead>
                <tr>
                  <th colSpan={4} style={{ textAlign: 'left' }}>
                    1. DATOS DEL FALLECIDO Y UBICACIÓN EN PARQUE
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="row-even">
                  <td style={{ fontWeight: 900, width: '22%' }}>NOMBRE DEL FALLECIDO:</td>
                  <td style={{ fontWeight: 900, fontSize: '12px', width: '32%' }}>
                    {inhumacion.nombre_difunto}
                  </td>
                  <td style={{ fontWeight: 900, width: '20%' }}>DOCUMENTO (DNI):</td>
                  <td style={{ fontFamily: "'Courier New', monospace", fontWeight: 800 }}>
                    {inhumacion.dni_difunto || 'Constatado en Acta'}
                  </td>
                </tr>
                <tr className="row-odd">
                  <td style={{ fontWeight: 900 }}>PARCELA DE DESTINO:</td>
                  <td>
                    <span className="parcela-pill">{parcNom}</span>
                  </td>
                  <td style={{ fontWeight: 900 }}>NIVEL / FOSA:</td>
                  <td style={{ fontWeight: 800 }}>Nivel {inhumacion.nivel_posicion || 1}</td>
                </tr>
                <tr className="row-even">
                  <td style={{ fontWeight: 900 }}>FECHA DE INHUMACIÓN:</td>
                  <td style={{ fontFamily: "'Courier New', monospace", fontWeight: 800 }}>
                    {fechaInh}
                  </td>
                  <td style={{ fontWeight: 900 }}>HORA REGISTRADA:</td>
                  <td style={{ fontFamily: "'Courier New', monospace", fontWeight: 800 }}>
                    {horaInh} hs
                  </td>
                </tr>
                <tr className="row-odd">
                  <td style={{ fontWeight: 900 }}>PROTOCOLO SANITARIO:</td>
                  <td>
                    <span className={inhumacion.es_covid ? 'badge-egreso' : 'badge-ingreso'}>
                      {inhumacion.es_covid
                        ? 'COVID-19 · Cofre Sellado'
                        : 'Protocolo Mortuorio Estándar'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 900 }}>CAUSA / SERVICIO:</td>
                  <td style={{ fontWeight: 700 }}>
                    {inhumacion.causa_defuncion || 'Natural / Defunción'} (
                    {inhumacion.empresa_funebrera || 'Aeterna Sepelios'})
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Constancia Legal con Borde Marcado */}
            <div
              style={{
                border: '1.5px solid #000000',
                padding: '10px 12px',
                borderRadius: '4px',
                fontSize: '10px',
                fontWeight: 600,
                lineHeight: 1.45,
                marginBottom: '12px',
              }}
            >
              <strong>CONSTANCIA REGISTRAL:</strong> Se deja constancia en la presente acta que el
              sepelio ha sido efectuado conforme a las disposiciones sanitarias y registrales
              vigentes. Los datos de la parcela <strong>{parcNom}</strong> (Nivel{' '}
              {inhumacion.nivel_posicion || 1}) y derechos de ocupación correspondientes quedan
              asentados en el Libro Digital de Inhumaciones de Aeterna Parque San Nicolás.
            </div>

            {/* Firmas */}
            <div className="footer-firmas">
              <div className="firma-block">
                <div className="firma-line">Oficial Mayor de Registro</div>
                <div className="firma-sub">Administración Aeterna</div>
              </div>
              <div className="firma-block">
                <div className="firma-line">
                  {inhumacion.empresa_funebrera || 'Aeterna Sepelios'}
                </div>
                <div className="firma-sub">Servicio de Pompas Fúnebres</div>
              </div>
              <div className="firma-block">
                <div className="firma-line">Dirección y Archivo</div>
                <div className="firma-sub">Constatación y Sello Oficial</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
