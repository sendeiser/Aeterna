import React from 'react'

export interface ReciboSeguroFisicoProps {
  recibiDe?: string
  certificado?: string | number
  laSumaDePesos?: string
  montoNumerico?: number
  concepto?: string
  reciboNro?: string
  fecha?: string
  esBlanco?: boolean
  className?: string
  variante?: 'default' | 'talonario' | 'a4-grid'
}

/**
 * Marca de agua de las dos palomas de la paz en vuelo enfrentadas.
 * Extraída directamente del escaneo oficial de alta resolución de recibo del seguro.pdf.
 */
export const PalomasWatermark: React.FC<{ className?: string; opacity?: string }> = ({
  className = 'w-[85%] max-h-[82%]',
  opacity = 'opacity-90',
}) => (
  <img
    src="/palomas_watermark.png"
    alt="Palomas de la paz de fondo"
    className={`pointer-events-none select-none object-contain ${opacity} ${className}`}
    style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
  />
)

/**
 * Componente exacto del recibo físico tradicional:
 * CEMENTERIO PARQUE SAN NICOLÁS - SEGURO PLAN INTEGRAL FAMILIAR
 * Color azul cobalto idéntico y palomas de fondo claramente visibles.
 */
export const ReciboSeguroFisico: React.FC<ReciboSeguroFisicoProps> = ({
  recibiDe = '',
  certificado = '',
  laSumaDePesos = '',
  montoNumerico,
  concepto = '',
  reciboNro = '',
  fecha,
  esBlanco = false,
  className = '',
  variante = 'default',
}) => {
  const isA4Grid = variante === 'a4-grid'

  return (
    <div
      className={`relative bg-white border border-slate-900 rounded-none text-slate-900 font-sans shadow-none overflow-hidden flex flex-col justify-between select-none ${
        isA4Grid
          ? 'p-2.5 sm:p-3 w-full h-[66mm] box-border'
          : 'p-6 w-full max-w-xl mx-auto min-h-[280px] shadow-sm'
      } ${className}`}
      style={{
        boxSizing: 'border-box',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
      }}
    >
      {/* Marca de Agua Central de Palomas de Alta Fidelidad */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden pt-5">
        <PalomasWatermark
          className={isA4Grid ? 'w-[80%] max-h-[76%]' : 'w-[88%] max-h-[80%]'}
          opacity="opacity-90"
        />
      </div>

      {/* Contenido Por Encima de la Marca de Agua (z-10) */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Encabezado Idéntico al Documento Escaneado Oficial */}
        <div className="text-center pt-0.5 pb-2">
          <h2
            className={`font-serif font-black tracking-wide uppercase leading-none ${
              isA4Grid ? 'text-[15px] sm:text-[16px]' : 'text-[20px] sm:text-[22px]'
            }`}
            style={{
              color: '#22338A',
              letterSpacing: '0.04em',
              textShadow: '0 0.5px 1px rgba(34, 51, 138, 0.25)',
              printColorAdjust: 'exact',
              WebkitPrintColorAdjust: 'exact',
            }}
          >
            CEMENTERIO PARQUE SAN NICOLÁS
          </h2>
          <h3
            className={`font-sans font-bold tracking-[0.16em] uppercase text-slate-900 mt-1 leading-none ${
              isA4Grid ? 'text-[9.5px] sm:text-[10.5px]' : 'text-[12px] sm:text-[13px]'
            }`}
          >
            SEGURO PLAN INTEGRAL FAMILIAR
          </h3>
        </div>

        {/* Campos Punteados Tradicionales con Tipografía Nítida */}
        <div
          className={`space-y-2 sm:space-y-3 leading-tight font-medium my-auto ${
            isA4Grid ? 'text-[11.5px] sm:text-[12px]' : 'text-[13.5px] sm:text-[14px]'
          }`}
        >
          {/* Fila 1: Recibí de */}
          <div className="flex items-end">
            <span className="font-bold text-slate-950 whitespace-nowrap mr-1.5 shrink-0">
              Recibí de
            </span>
            <div className="relative flex-1 border-b-[1.5px] border-dotted border-slate-900 min-h-[18px]">
              {!esBlanco && recibiDe && (
                <span className="absolute left-1 bottom-0.5 font-serif font-bold text-slate-950 truncate max-w-full">
                  {recibiDe}
                </span>
              )}
            </div>
          </div>

          {/* Fila 2: Certificado: */}
          <div className="flex items-end">
            <span className="font-bold text-slate-950 whitespace-nowrap mr-1.5 shrink-0">
              Certificado:
            </span>
            <div className="relative flex-1 border-b-[1.5px] border-dotted border-slate-900 min-h-[18px]">
              {!esBlanco && certificado && (
                <span className="absolute left-1 bottom-0.5 font-mono font-bold text-slate-950">
                  {typeof certificado === 'number' || !String(certificado).startsWith('#')
                    ? `#${certificado}`
                    : certificado}
                </span>
              )}
            </div>
          </div>

          {/* Fila 3: La suma de pesos */}
          <div className="flex items-end">
            <span className="font-bold text-slate-950 whitespace-nowrap mr-1.5 shrink-0">
              La suma de pesos
            </span>
            <div className="relative flex-1 border-b-[1.5px] border-dotted border-slate-900 min-h-[18px]">
              {!esBlanco && (laSumaDePesos || montoNumerico) && (
                <span className="absolute left-1 bottom-0.5 font-serif font-bold text-slate-950 truncate max-w-full">
                  {laSumaDePesos || `$ ${montoNumerico?.toLocaleString('es-AR')}`}
                </span>
              )}
            </div>
          </div>

          {/* Fila 4: Concepto: */}
          <div className="flex items-end">
            <span className="font-bold text-slate-950 whitespace-nowrap mr-1.5 shrink-0">
              Concepto:
            </span>
            <div className="relative flex-1 border-b-[1.5px] border-dotted border-slate-900 min-h-[18px]">
              {!esBlanco && concepto && (
                <span className="absolute left-1 bottom-0.5 font-sans font-semibold text-slate-950 truncate max-w-full">
                  {concepto}
                </span>
              )}
            </div>
          </div>

          {/* Fila 5: Recibo Nº */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end flex-1">
              <span className="font-bold text-slate-950 whitespace-nowrap mr-1.5 shrink-0">
                Recibo Nº
              </span>
              <div className="relative flex-1 border-b-[1.5px] border-dotted border-slate-900 min-h-[18px]">
                {!esBlanco && reciboNro && (
                  <span className="absolute left-1 bottom-0.5 font-mono font-bold text-slate-950">
                    {reciboNro}
                  </span>
                )}
              </div>
            </div>

            {/* Fecha en caso de estar emitido */}
            {fecha && !esBlanco && (
              <div className="text-[10.5px] text-slate-700 font-mono font-semibold shrink-0 pb-0.5">
                Fecha: {fecha}
              </div>
            )}
          </div>
        </div>

        {/* Espaciador inferior para preservar proporciones idénticas al original */}
        <div className="h-1" />
      </div>
    </div>
  )
}
