import { ApiProperty } from '@nestjs/swagger';
import { MascotaResumenDto, UsuarioDto } from './usuario.schema.js';

/**
 * Pet as returned by /mascotas. Every operation loads or sets the owner, which
 * is returned without the password hash (MascotasService.sanitizeMascota).
 */
export class MascotaDto extends MascotaResumenDto {
  @ApiProperty({ type: UsuarioDto, description: 'Dueño de la mascota (sin contraseña).' })
  usuario: UsuarioDto;
}
