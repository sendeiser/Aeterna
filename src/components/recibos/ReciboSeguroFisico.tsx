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
 * Marca de agua de dos palomas de la paz enfrentadas en vuelo sosteniendo rama de olivo.
 * Fiel al diseño tradicional escaneado en recibo del seguro.pdf.
 */
export const PalomasWatermark: React.FC<{ className?: string }> = ({ className = 'w-64 h-32 opacity-20' }) => (
  <svg
    viewBox="0 0 400 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`pointer-events-none select-none text-slate-700 ${className}`}
  >
    {/* Rama de olivo central */}
    <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <path d="M 180 102 C 190 98 210 98 220 102" />
      <path d="M 193 99 C 195 93 199 92 201 95 C 199 98 195 99 193 99 Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M 207 99 C 205 93 201 92 199 95 C 201 98 205 99 207 99 Z" fill="currentColor" fillOpacity="0.4" />
      <path d="M 188 101 C 185 96 182 96 183 99 Z" fill="currentColor" fillOpacity="0.3" />
      <path d="M 212 101 C 215 96 218 96 217 99 Z" fill="currentColor" fillOpacity="0.3" />
    </g>

    {/* Paloma Izquierda (volando hacia la derecha) */}
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Cabeza y pico hacia la rama */}
      <path d="M 185 98 C 180 94 175 92 170 93 C 166 94 163 97 163 100 C 163 104 167 106 172 107 C 178 108 184 104 186 100 Z" fill="currentColor" fillOpacity="0.1" />
      <circle cx="171" cy="97" r="1.5" fill="currentColor" />
      <path d="M 182 97 L 188 99 L 182 101 Z" fill="currentColor" />

      {/* Pecho y vientre */}
      <path d="M 166 106 C 160 115 145 125 125 124 C 110 123 98 116 85 120" />
      
      {/* Alas desplegadas arriba hacia la izquierda */}
      <path d="M 155 100 C 150 85 142 65 130 50 C 120 38 108 42 110 55 C 112 65 118 78 124 90" />
      <path d="M 132 52 C 122 45 112 50 116 62 C 120 72 126 84 134 94" />
      <path d="M 122 62 C 115 58 108 63 111 74 C 114 84 122 96 130 102" />
      <path d="M 112 75 C 106 72 101 78 104 87 C 108 96 117 104 125 108" />

      {/* Cola plumosa */}
      <path d="M 85 120 C 70 122 55 118 45 112 C 55 125 68 132 80 134 C 65 136 52 134 42 128 C 55 138 72 142 88 138" />
    </g>

    {/* Paloma Derecha (volando hacia la izquierda, simétrica) */}
    <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
      {/* Cabeza y pico hacia la rama */}
      <path d="M 215 98 C 220 94 225 92 230 93 C 234 94 237 97 237 100 C 237 104 233 106 228 107 C 222 108 216 104 214 100 Z" fill="currentColor" fillOpacity="0.1" />
      <circle cx="229" cy="97" r="1.5" fill="currentColor" />
      <path d="M 218 97 L 212 99 L 218 101 Z" fill="currentColor" />

      {/* Pecho y vientre */}
      <path d="M 234 106 C 240 115 255 125 275 124 C 290 123 302 116 315 120" />
      
      {/* Alas desplegadas arriba hacia la derecha */}
      <path d="M 245 100 C 250 85 258 65 270 50 C 280 38 292 42 290 55 C 288 65 282 78 276 90" />
      <path d="M 268 52 C 278 45 288 50 284 62 C 280 72 274 84 266 94" />
      <path d="M 278 62 C 285 58 292 63 289 74 C 286 84 278 96 270 102" />
      <path d="M 288 75 C 294 72 299 78 296 87 C 292 96 283 104 275 108" />

      {/* Cola plumosa */}
      <path d="M 315 120 C 330 122 345 118 355 112 C 345 125 332 132 320 134 C 335 136 348 134 358 128 C 345 138 328 142 312 138" />
    </g>
  </svg>
)

/**
 * Componente exacto del recibo físico tradicional:
 * CEMENTERIO PARQUE SAN NICOLÁS - SEGURO PLAN INTEGRAL FAMILIAR
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
      className={`relative bg-white border-2 border-slate-900 rounded-none text-slate-900 font-sans shadow-none overflow-hidden flex flex-col justify-between ${
        isA4Grid
          ? 'p-3 w-full h-[66mm] box-border'
          : 'p-5 w-full max-w-xl mx-auto min-h-[260px]'
      } ${className}`}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Marca de Agua Central de Palomas */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <PalomasWatermark className={isA4Grid ? 'w-56 h-28 opacity-25' : 'w-80 h-40 opacity-20'} />
      </div>

      {/* Contenido Por Encima de la Marca de Agua */}
      <div className="relative z-10 flex flex-col justify-between h-full">
        {/* Encabezado Fiel al Documento Físico */}
        <div className="text-center pb-2 border-b border-slate-900/60 mb-2">
          <h2 className="font-serif font-black tracking-wide text-slate-950 uppercase text-[15px] sm:text-[17px] leading-tight">
            CEMENTERIO PARQUE SAN NICOLÁS
          </h2>
          <h3 className="font-sans font-bold tracking-widest text-slate-800 uppercase text-[10px] sm:text-[11.5px] mt-0.5">
            SEGURO PLAN INTEGRAL FAMILIAR
          </h3>
        </div>

        {/* Campos Punteados Tradicionales */}
        <div className="space-y-2 sm:space-y-2.5 text-xs sm:text-[13px] leading-tight font-medium my-auto">
          {/* Fila 1: Recibí de */}
          <div className="flex items-end">
            <span className="font-bold text-slate-900 whitespace-nowrap mr-1.5 shrink-0">
              Recibí de
            </span>
            <div className="relative flex-1 border-b border-dotted border-slate-800 min-h-[18px]">
              {!esBlanco && recibiDe && (
                <span className="absolute left-1 bottom-0.5 font-serif font-semibold text-slate-950 truncate max-w-full">
                  {recibiDe}
                </span>
              )}
            </div>
          </div>

          {/* Fila 2: Certificado */}
          <div className="flex items-end">
            <span className="font-bold text-slate-900 whitespace-nowrap mr-1.5 shrink-0">
              Certificado:
            </span>
            <div className="relative flex-1 border-b border-dotted border-slate-800 min-h-[18px]">
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
            <span className="font-bold text-slate-900 whitespace-nowrap mr-1.5 shrink-0">
              La suma de pesos
            </span>
            <div className="relative flex-1 border-b border-dotted border-slate-800 min-h-[18px]">
              {!esBlanco && (laSumaDePesos || montoNumerico) && (
                <span className="absolute left-1 bottom-0.5 font-serif font-semibold text-slate-950 truncate max-w-full">
                  {laSumaDePesos || `$ ${montoNumerico?.toLocaleString('es-AR')}`}
                </span>
              )}
            </div>
          </div>

          {/* Fila 4: Concepto */}
          <div className="flex items-end">
            <span className="font-bold text-slate-900 whitespace-nowrap mr-1.5 shrink-0">
              Concepto:
            </span>
            <div className="relative flex-1 border-b border-dotted border-slate-800 min-h-[18px]">
              {!esBlanco && concepto && (
                <span className="absolute left-1 bottom-0.5 font-sans font-medium text-slate-900 truncate max-w-full">
                  {concepto}
                </span>
              )}
            </div>
          </div>

          {/* Fila 5: Recibo Nº */}
          <div className="flex items-end justify-between gap-3">
            <div className="flex items-end flex-1">
              <span className="font-bold text-slate-900 whitespace-nowrap mr-1.5 shrink-0">
                Recibo Nº
              </span>
              <div className="relative flex-1 border-b border-dotted border-slate-800 min-h-[18px]">
                {!esBlanco && reciboNro && (
                  <span className="absolute left-1 bottom-0.5 font-mono font-bold text-slate-950">
                    {reciboNro}
                  </span>
                )}
              </div>
            </div>

            {/* Fecha / Firma en caso de estar emitido */}
            {fecha && !esBlanco && (
              <div className="text-[10px] text-slate-600 font-mono shrink-0 pb-0.5">
                Fecha: {fecha}
              </div>
            )}
          </div>
        </div>

        {/* Borde inferior estético sutil o corte */}
        <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-mono select-none">
          <span>PARQUE SAN NICOLÁS</span>
          <span>VALIDEZ OFICIAL</span>
        </div>
      </div>
    </div>
  )
}
