export interface HistoriaClinica {
  id: string;
  mascotaId: string;
  fechaConsulta: Date;
  diagnostico: string;
  observaciones: string;
  pesoRegistrado: number;
  veterinarioResponsable: string;
}
