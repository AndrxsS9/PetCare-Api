export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  password: string;
  telefono: string;
  rol: 'DUENO' | 'VETERINARIO' | 'ADMIN';
  estado: boolean;
}
