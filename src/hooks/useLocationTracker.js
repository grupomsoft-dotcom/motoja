import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useLocationTracker(motoristaId, ativo = false) {
  const lastUpdate = useRef(0)

  useEffect(() => {
    if (!ativo || !motoristaId) return

    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        const agora = Date.now()

        // Throttling: Envia para o banco apenas a cada 5 segundos 
        // para economizar bateria e processamento do Supabase
        if (agora - lastUpdate.current > 5000) {
          lastUpdate.current = agora

          const { error } = await supabase
            .from('motorista_localizacoes')
            .upsert({ 
              motorista_id: motoristaId,
              lat: latitude,
              lng: longitude,
              ultima_atualizacao: new Date().toISOString()
            }, { onConflict: 'motorista_id' })

          if (error) console.error("Erro ao transmitir GPS:", error.message)
        }
      },
      (err) => console.warn("Erro no Tracker:", err),
      { 
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000 
      }
    )

    return () => navigator.geolocation.clearWatch(watchId)
  }, [motoristaId, ativo])
}