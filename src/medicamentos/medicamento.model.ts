export interface Medicamento {
  id: string;
  mascotaId: string;
  nombreMedicamento: string;
  dosis: string;
  frecuencia: string;
  inicio: Date;
  fin: Date;
  observaciones: string;
  estado: boolean;
}
