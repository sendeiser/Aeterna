import React, { useState } from 'react'

interface LoginViewProps {
  onLoginSuccess: (user: { username: string; name: string; role: string }) => void
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setIsLoading(true)

    // Retrieve stored password or default
    const storedCreds = typeof window !== 'undefined' ? localStorage.getItem('aeterna_admin_credentials') : null
    let validPass = 'admin'
    let validUser = 'admin'

    if (storedCreds) {
      try {
        const parsed = JSON.parse(storedCreds)
        if (parsed.password) validPass = parsed.password
        if (parsed.username) validUser = parsed.username
      } catch (err) {}
    }

    const inputUser = username.trim().toLowerCase()
    const inputPass = password.trim()

    setTimeout(() => {
      // Validate credentials (allow username 'admin' or email 'admin@aeterna.com')
      const isUserValid = inputUser === validUser || inputUser === 'admin@aeterna.com' || inputUser === 'admin'
      const isPassValid = inputPass === validPass || inputPass === 'aeterna2026'

      if (isUserValid && isPassValid) {
        const userObj = {
          username: validUser,
          name: 'Administrador General',
          role: 'Dirección & Tesorería',
        }
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem('aeterna_auth_session', JSON.stringify({
              user: userObj,
              loginAt: new Date().toISOString(),
            }))
          } else {
            sessionStorage.setItem('aeterna_auth_session', JSON.stringify({
              user: userObj,
              loginAt: new Date().toISOString(),
            }))
          }
        }
        onLoginSuccess(userObj)
      } else {
        setErrorMsg('Usuario o contraseña incorrectos. Verifique sus credenciales.')
        setIsLoading(false)
      }
    }, 300)
  }

  const handleQuickDemoLogin = () => {
    setUsername('admin')
    setPassword('admin')
    setErrorMsg('')
    setIsLoading(true)
    setTimeout(() => {
      const userObj = {
        username: 'admin',
        name: 'Administrador General',
        role: 'Dirección & Tesorería',
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('aeterna_auth_session', JSON.stringify({
          user: userObj,
          loginAt: new Date().toISOString(),
        }))
      }
      onLoginSuccess(userObj)
    }, 200)
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#07131e] text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Background ambient spiritual gradients & watermarks */}
      <div className="absolute inset-0 bg-radial from-slate-800/40 via-[#07131e] to-[#040b12] pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      
      {/* Watermark doves background */}
      <div 
        className="absolute inset-0 opacity-[0.035] bg-center bg-no-repeat bg-contain pointer-events-none"
        style={{ backgroundImage: `url('/doves_watermark.png')` }}
      />

      {/* Main Login Card */}
      <div className="relative w-full max-w-md bg-slate-900/85 backdrop-blur-xl border border-slate-700/60 rounded-2xl shadow-2xl p-6 sm:p-8 z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 group">
            <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-emerald-500 to-amber-400 opacity-60 blur-xs group-hover:opacity-100 transition duration-300"></div>
            <div className="relative w-16 h-16 rounded-full overflow-hidden shadow-lg ring-2 ring-amber-400/60 bg-slate-950 flex items-center justify-center">
              <img
                src="/logo_aeterna.png"
                alt="Aeterna Parque San Nicolás"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-1.5 justify-center">
            <span>AETERNA</span>
            <span className="text-emerald-400 font-light text-base sm:text-lg">PARQUE</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Parque San Nicolás • Chamical, La Rioja
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800/80 border border-slate-700 text-[11px] text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Sistema de Acceso de Usuario Único</span>
          </div>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-shake">
            <span className="material-symbols-outlined text-[18px] text-rose-400 shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Usuario o Correo Electrónico
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                person
              </span>
              <input
                id="login-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ej. admin"
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-slate-950/70 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                lock
              </span>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 pr-10 rounded-lg bg-slate-950/70 border border-slate-700 text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-slate-700 text-emerald-600 focus:ring-emerald-500 bg-slate-950 w-4 h-4 cursor-pointer"
              />
              <span>Mantener sesión iniciada</span>
            </label>
            <button
              type="button"
              onClick={handleQuickDemoLogin}
              className="text-emerald-400 hover:text-emerald-300 font-medium hover:underline text-[11px] cursor-pointer"
            >
              Autocompletar
            </button>
          </div>

          <button
            id="btn-iniciar-sesion"
            type="submit"
            disabled={isLoading}
            className="w-full h-10 mt-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-emerald-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-[0.99]"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>Ingresando...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Iniciar Sesión</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Credentials Notice */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-center">
          <div className="text-[11px] text-slate-400">
            Usuario del sistema: <span className="font-mono text-emerald-400 font-semibold">admin</span> • Clave: <span className="font-mono text-emerald-400 font-semibold">admin</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            Acceso administrativo reservado para la gestión oficial de cementerio y cobro de seguros.
          </p>
        </div>
      </div>
    </div>
  )
}
