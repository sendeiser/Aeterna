import React from 'react'
import { Inhumacion } from '../../types/database'

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
  if (!isOpen || !inhumacion) return null

  const parcNom =
    typeof inhumacion.parcela === 'object'
      ? inhumacion.parcela?.nomenclatura
      : inhumacion.parcela || 'S/D'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        data-printable-modal="true"
        className="bg-surface-container-lowest border border-outline-variant w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden text-on-surface flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-w-none print:w-full print:max-h-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-outline-variant bg-surface-container-low print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[22px]">description</span>
            <span className="font-bold text-sm text-primary uppercase tracking-wide">
              Acta Oficial de Inhumación & Registro Sanitario
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 h-8 rounded-lg bg-primary hover:bg-secondary text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">print</span>
              <span>Imprimir Constancia</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-outline hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Printable Certificate Body */}
        <div id="printable-receipt" className="p-6 sm:p-8 space-y-6 overflow-y-auto custom-scroll bg-white print:p-0 print:overflow-visible">
          {/* Municipal Crest & Title */}
          <div className="text-center pb-4 border-b-2 border-primary/20 space-y-1">
            <div className="text-[11px] font-bold text-outline uppercase tracking-widest">
              MUNICIPALIDAD DE CHAMICAL · PROVINCIA DE LA RIOJA
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-primary tracking-tight">
              REGISTRO CADASTRAL Y LIBRO DIGITAL DE INHUMACIONES
            </h1>
            <div className="text-xs text-on-surface-variant font-medium">
              Aeterna Parque Municipal · Conforme a Ley Sanitaria N° 4.120 y Ordenanza Funeraria
            </div>
            <div className="inline-block mt-2 px-3 py-1 rounded bg-surface-container-low border border-outline-variant text-xs font-mono font-bold text-primary">
              TOMO XXXII · ACTA / FOLIO N° {folioNumber}
            </div>
          </div>

          {/* Certificate Data Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1">
              <span className="text-[10px] font-bold uppercase text-outline block">
                Nombre del Fallecido
              </span>
              <span className="text-sm font-bold text-on-surface block">
                {inhumacion.nombre_difunto}
              </span>
              <span className="text-outline font-mono">
                {inhumacion.dni_difunto ? `DNI: ${inhumacion.dni_difunto}` : 'Identidad comprobada en acta'}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1">
              <span className="text-[10px] font-bold uppercase text-outline block">
                Ubicación de Destino en Parque
              </span>
              <span className="text-sm font-mono font-bold text-primary block">
                Parcela {parcNom}
              </span>
              <span className="text-emerald-700 font-semibold">
                Nivel Asignado: Fosa {inhumacion.nivel_posicion || 1}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1">
              <span className="text-[10px] font-bold uppercase text-outline block">
                Fecha y Hora de Inhumación
              </span>
              <span className="font-semibold text-on-surface block">
                {inhumacion.fecha_inhumacion ? new Date(inhumacion.fecha_inhumacion).toLocaleDateString('es-AR') : 'S/D'}
              </span>
              <span className="text-outline">
                Hora: {inhumacion.fecha_inhumacion?.slice(11, 16) || '10:00'} hs
              </span>
            </div>

            <div className="p-3 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-1">
              <span className="text-[10px] font-bold uppercase text-outline block">
                Protocolo Sanitario Aplicado
              </span>
              {inhumacion.es_covid ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-900 border border-amber-300 text-[11px]">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                  COVID-19 · Cofre Sellado / Cremación Diferida
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px]">
                  Protocolo Mortuorio Estándar
                </span>
              )}
              <span className="block text-[11px] text-outline mt-0.5 truncate">
                Causa: {inhumacion.causa_defuncion || 'Natural / Defunción'}
              </span>
            </div>
          </div>

          {/* Legal Certification Text */}
          <div className="p-4 rounded-lg bg-surface-container-low border border-outline-variant/60 text-xs text-on-surface-variant leading-relaxed">
            Se deja constancia en la presente acta que el sepelio ha sido efectuado conforme a las disposiciones
            sanitarias y registrales vigentes del Municipio de Chamical. Los datos de la parcela y derechos de
            ocupación correspondientes quedan asentados de forma indeleble en el sistema de Registro Mortuorio.
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center text-xs">
            <div className="space-y-1">
              <div className="w-36 mx-auto border-b border-outline-variant pb-7"></div>
              <div className="font-bold text-on-surface">Lic. R. Albarracín</div>
              <div className="text-[10px] text-outline">Oficial Mayor de Registro</div>
            </div>
            <div className="space-y-1">
              <div className="w-36 mx-auto border-b border-outline-variant pb-7"></div>
              <div className="font-bold text-on-surface">{inhumacion.empresa_funebrera || 'Aeterna Sepelios'}</div>
              <div className="text-[10px] text-outline">Servicio de Pompas Fúnebres</div>
            </div>
            <div className="space-y-1">
              <div className="w-36 mx-auto border-b border-outline-variant pb-7"></div>
              <div className="font-bold text-on-surface">Of. Registro Civil</div>
              <div className="text-[10px] text-outline">Constatación y Firma Legal</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
