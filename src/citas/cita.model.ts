export interface Cita {
  id: string;
  mascotaId: string;
  fechaHora: Date;
  motivo: string;
  lugarveterinaria: string;
  estado: 'PROGRAMADA' | 'REALIZADA' | 'CANCELADA';
}
