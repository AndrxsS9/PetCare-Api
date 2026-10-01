export interface Mascota {
  id: string;
  usuarioId: string;
  nombre: string;
  especie: 'PERRO' | 'GATO' | 'AVE' | 'OTRO';
  raza: string;
  fecha_nacimiento: Date;
  peso: number;
  fotoUrl: string;
  estado: boolean;
}
