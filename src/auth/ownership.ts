import { NotFoundException } from '@nestjs/common';
import { FindOptionsWhere, Repository } from 'typeorm';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import type { MascotaEntity } from '../mascotas/mascota.entity.js';
import type { AuthenticatedUser } from './auth.types.js';

/**
 * Resource-ownership policy for pets and every pet-related record
 * (citas, historias clínicas, alimentación, vacunas, medicamentos):
 *
 * - ADMIN: unrestricted.
 * - DUENO and VETERINARIO: only pets whose `usuarioId` is their own id, and
 *   only records attached to those pets. There is no veterinarian-to-pet
 *   assignment model yet, so veterinarians get no extra access.
 *
 * The identity always comes from the verified JWT (`request.user`), never
 * from the request body. Restrictions are expressed as TypeORM `where`
 * fragments so the database filters the rows; foreign records are reported
 * exactly like missing ones (404) to avoid disclosing their existence.
 */
export const isAdmin = (user: AuthenticatedUser): boolean => user.rol === RolUsuario.ADMIN;

/** `where` fragment limiting a MascotaEntity query to the user's own pets. */
export const petOwnershipWhere = (user: AuthenticatedUser): FindOptionsWhere<MascotaEntity> =>
  isAdmin(user) ? {} : { usuarioId: user.id };

/**
 * `where` fragment limiting a pet-related entity query to records whose pet
 * belongs to the user. TypeORM turns `{ mascota: { usuarioId } }` into an
 * inner join used only for filtering, so the response shape is unchanged.
 */
export const petRecordOwnershipWhere = <T extends { mascota: MascotaEntity }>(
  user: AuthenticatedUser,
): FindOptionsWhere<T> =>
  (isAdmin(user) ? {} : { mascota: { usuarioId: user.id } }) as FindOptionsWhere<T>;

/**
 * Deletes a pet-related record only if the user may manage it.
 * - ADMIN: a single `DELETE ... WHERE id = :id` (unchanged behavior).
 * - Others: the record is first located with the ownership-scoped query; a
 *   missing or foreign record yields `affected: 0` (→ 404) without deleting.
 */
export async function deletePetRecord<T extends { id: string; mascota: MascotaEntity }>(
  repository: Repository<T>,
  id: string,
  user: AuthenticatedUser,
): Promise<{ affected?: number | null }> {
  if (isAdmin(user)) {
    return repository.delete(id);
  }

  const record = await repository.findOne({
    where: { id, ...petRecordOwnershipWhere<T>(user) } as FindOptionsWhere<T>,
  });

  if (!record) {
    return { affected: 0 };
  }

  return repository.delete(record.id);
}

/**
 * Loads a pet the user is allowed to attach records to. Unknown pets and
 * pets owned by someone else produce the same 404, so a client-supplied
 * `mascotaId` can never be used to write into another owner's pet.
 */
export async function findAccessibleMascota(
  mascotaRepository: Repository<MascotaEntity>,
  mascotaId: string,
  user: AuthenticatedUser,
): Promise<MascotaEntity> {
  const mascota = await mascotaRepository.findOne({
    where: { id: mascotaId, ...petOwnershipWhere(user) },
  });

  if (!mascota) {
    throw new NotFoundException(`Mascota con ID ${mascotaId} no encontrada`);
  }

  return mascota;
}
