import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MascotasService } from './mascotas.service.js';
import { MascotaEntity } from './mascota.entity.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { EspecieMascota, CreateMascotaDto } from './mascota.dto.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

// Same shape as the user the JWT strategy attaches to `request.user`. ADMIN is
// unrestricted by the ownership policy, so the original assertions still hold;
// ownership-restricted behavior is covered in src/auth/ownership*.spec.ts.
const adminUser: AuthenticatedUser = {
  id: '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d',
  nombre: 'Admin',
  email: 'admin@petcare.com',
  telefono: '3000000000',
  rol: RolUsuario.ADMIN,
  estado: true,
  mascotas: [],
};

describe('MascotasService', () => {
  let service: MascotasService;
  let mascotaRepo: Repository<MascotaEntity>;
  let usuarioRepo: Repository<UsuarioEntity>;

  const mockUsuario: UsuarioEntity = {
    id: 'user-uuid-1234',
    nombre: 'Dueño Mascota',
    email: 'dueno@petcare.com',
    password: '$2b$10$hashedPasswordHere',
    telefono: '3001234567',
    rol: RolUsuario.DUENO,
    estado: true,
    mascotas: [],
  };

  const mockMascota: MascotaEntity = {
    id: 'pet-uuid-5678',
    usuarioId: mockUsuario.id,
    nombre: 'Firulais',
    especie: EspecieMascota.PERRO,
    raza: 'Criollo',
    fecha_nacimiento: new Date('2021-01-01'),
    peso: 15.5,
    fotoUrl: 'http://foto.jpg',
    estado: true,
    usuario: mockUsuario,
  };

  const mockMascotaRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };

  const mockUsuarioRepo = {
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MascotasService,
        {
          provide: getRepositoryToken(MascotaEntity),
          useValue: mockMascotaRepo,
        },
        {
          provide: getRepositoryToken(UsuarioEntity),
          useValue: mockUsuarioRepo,
        },
      ],
    }).compile();

    service = module.get<MascotasService>(MascotasService);
    mascotaRepo = module.get<Repository<MascotaEntity>>(getRepositoryToken(MascotaEntity));
    usuarioRepo = module.get<Repository<UsuarioEntity>>(getRepositoryToken(UsuarioEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(mascotaRepo).toBeDefined();
    expect(usuarioRepo).toBeDefined();
  });

  describe('findAll', () => {
    it('debe listar todas las mascotas con su relación de usuario saneada (sin password)', async () => {
      mockMascotaRepo.find.mockResolvedValue([{ ...mockMascota }]);

      const result = await service.findAll(adminUser);

      // ADMIN: empty ownership filter, i.e. every pet.
      expect(mockMascotaRepo.find).toHaveBeenCalledWith({
        where: {},
        relations: { usuario: true },
      });
      expect(result).toHaveLength(1);
      expect(result[0].nombre).toBe('Firulais');
      expect(result[0].usuario).not.toHaveProperty('password');
    });
  });

  describe('findById', () => {
    it('debe encontrar una mascota por ID y sanear los datos del usuario asociado', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });

      const result = await service.findById(mockMascota.id, adminUser);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockMascota.id },
        relations: { usuario: true },
      });
      expect(result.message).toBe('Mascota encontrada');
      expect(result.data.id).toBe(mockMascota.id);
      expect(result.data.usuario).not.toHaveProperty('password');
    });

    it('debe lanzar NotFoundException si la mascota no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existent-id', adminUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreateMascotaDto = {
      usuarioId: mockUsuario.id,
      nombre: 'Michi',
      especie: EspecieMascota.GATO,
      raza: 'Angora',
      fecha_nacimiento: new Date('2022-05-10'),
      peso: 4.0,
      fotoUrl: '',
      estado: true,
    };

    it('debe crear la mascota si el usuario existe y asociarla correctamente', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      mockMascotaRepo.create.mockImplementation((dto) => dto as MascotaEntity);
      mockMascotaRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'new-pet-uuid',
        } as MascotaEntity),
      );

      const result = await service.create(createDto, adminUser);

      expect(mockUsuarioRepo.findOne).toHaveBeenCalledWith({
        where: { id: createDto.usuarioId },
      });
      expect(mockMascotaRepo.create).toHaveBeenCalled();
      expect(mockMascotaRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('Mascota creada con éxito');
      expect(result.data.nombre).toBe('Michi');
      expect(result.data.usuario).not.toHaveProperty('password');
    });

    it('debe rechazar la creación si el usuario asociado NO existe', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(null);

      await expect(service.create(createDto, adminUser)).rejects.toThrow(NotFoundException);
      expect(mockMascotaRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debe actualizar los datos de la mascota satisfactoriamente', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });
      mockMascotaRepo.save.mockImplementation((m) => Promise.resolve(m));

      const result = await service.update(mockMascota.id, {
        nombre: 'Firulais Segundo',
        peso: 16.0,
      }, adminUser);

      expect(result.message).toBe('Mascota actualizada con éxito');
      expect(result.data.nombre).toBe('Firulais Segundo');
      expect(result.data.peso).toBe(16.0);
    });

    it('debe lanzar NotFoundException si la mascota a actualizar no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { nombre: 'Nuevo Nombre' }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar la transferencia si el nuevo usuario no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });
      mockUsuarioRepo.findOne.mockResolvedValue(null); // Nuevo usuario no existe

      await expect(
        service.update(mockMascota.id, { usuarioId: 'user-inexistente' }, adminUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('debe eliminar la mascota satisfactoriamente', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(mockMascota);
      mockMascotaRepo.remove.mockResolvedValue(mockMascota);

      const result = await service.delete(mockMascota.id, adminUser);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({ where: { id: mockMascota.id } });
      expect(mockMascotaRepo.remove).toHaveBeenCalledWith(mockMascota);
      expect(result.message).toBe('Mascota eliminada con éxito');
    });

    it('debe lanzar NotFoundException si la mascota a eliminar no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('inexistente', adminUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('ownership (DUENO / VETERINARIO)', () => {
    const { password: _pw, ...ownerSafe } = mockUsuario;
    const owner: AuthenticatedUser = ownerSafe;
    const otherOwner: AuthenticatedUser = { ...ownerSafe, id: 'other-user-uuid', email: 'b@petcare.com' };
    const vet: AuthenticatedUser = { ...ownerSafe, id: 'vet-uuid', rol: RolUsuario.VETERINARIO };

    beforeEach(() => {
      mockMascotaRepo.create.mockImplementation((dto) => dto as MascotaEntity);
      mockMascotaRepo.save.mockImplementation((m) => Promise.resolve({ id: 'new-pet-uuid', ...m }));
    });

    it('findAll filtra por el dueño autenticado en la consulta', async () => {
      mockMascotaRepo.find.mockResolvedValue([]);
      await service.findAll(owner);
      expect(mockMascotaRepo.find).toHaveBeenCalledWith({
        where: { usuarioId: owner.id },
        relations: { usuario: true },
      });
    });

    it('findAll de un veterinario sin mascotas propias se limita a su id', async () => {
      mockMascotaRepo.find.mockResolvedValue([]);
      await expect(service.findAll(vet)).resolves.toEqual([]);
      expect(mockMascotaRepo.find).toHaveBeenCalledWith({
        where: { usuarioId: vet.id },
        relations: { usuario: true },
      });
    });

    it('findById de una mascota ajena responde 404 (igual que inexistente)', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);
      await expect(service.findById(mockMascota.id, otherOwner)).rejects.toThrow(
        new NotFoundException(`Mascota con ID ${mockMascota.id} no encontrada`),
      );
      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockMascota.id, usuarioId: otherOwner.id },
        relations: { usuario: true },
      });
    });

    const baseDto: CreateMascotaDto = {
      nombre: 'Michi',
      especie: EspecieMascota.GATO,
      raza: 'Angora',
      fecha_nacimiento: new Date('2022-05-10'),
      peso: 4.0,
    };

    it('create sin usuarioId asigna la mascota al usuario autenticado', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);

      const result = await service.create(baseDto, owner);

      expect(mockUsuarioRepo.findOne).toHaveBeenCalledWith({ where: { id: owner.id } });
      expect(mockMascotaRepo.create.mock.calls[0][0].usuarioId).toBe(owner.id);
      expect(result.data.usuario).not.toHaveProperty('password');
    });

    it('create con el propio usuarioId es válido', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue(mockUsuario);
      await service.create({ ...baseDto, usuarioId: owner.id }, owner);
      expect(mockMascotaRepo.save).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['DUENO', () => owner],
      ['VETERINARIO', () => vet],
    ])('create para otro usuario como %s responde 403 sin escribir', async (_rol, who) => {
      await expect(
        service.create({ ...baseDto, usuarioId: 'someone-else' }, who()),
      ).rejects.toThrow(ForbiddenException);
      expect(mockUsuarioRepo.findOne).not.toHaveBeenCalled();
      expect(mockMascotaRepo.save).not.toHaveBeenCalled();
    });

    it('ADMIN puede crear una mascota para otro usuario existente', async () => {
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario, id: otherOwner.id });

      await service.create({ ...baseDto, usuarioId: otherOwner.id }, adminUser);

      expect(mockUsuarioRepo.findOne).toHaveBeenCalledWith({ where: { id: otherOwner.id } });
      expect(mockMascotaRepo.create.mock.calls[0][0].usuarioId).toBe(otherOwner.id);
    });

    it('update de una mascota ajena responde 404 y no guarda', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update(mockMascota.id, { nombre: 'Robada' }, otherOwner),
      ).rejects.toThrow(NotFoundException);
      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockMascota.id, usuarioId: otherOwner.id },
        relations: { usuario: true },
      });
      expect(mockMascotaRepo.save).not.toHaveBeenCalled();
    });

    it('un DUENO no puede transferir su mascota (403, sin guardar)', async () => {
      const stored = { ...mockMascota };
      mockMascotaRepo.findOne.mockResolvedValue(stored);

      await expect(
        service.update(mockMascota.id, { nombre: 'Otro', usuarioId: otherOwner.id }, owner),
      ).rejects.toThrow(
        new ForbiddenException('Solo un administrador puede transferir la propiedad de una mascota'),
      );
      expect(mockUsuarioRepo.findOne).not.toHaveBeenCalled();
      expect(mockMascotaRepo.save).not.toHaveBeenCalled();
      expect(stored.usuarioId).toBe(owner.id);
      expect(stored.nombre).toBe('Firulais');
    });

    it('enviar el propio usuarioId en update no es una transferencia', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });

      const result = await service.update(mockMascota.id, { usuarioId: owner.id, peso: 17 }, owner);

      expect(result.data.peso).toBe(17);
      expect(result.data.usuarioId).toBe(owner.id);
    });

    it('ADMIN transfiere la mascota tras verificar que el destino existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });
      mockUsuarioRepo.findOne.mockResolvedValue({ ...mockUsuario, id: otherOwner.id });

      const result = await service.update(mockMascota.id, { usuarioId: otherOwner.id }, adminUser);

      expect(mockUsuarioRepo.findOne).toHaveBeenCalledWith({ where: { id: otherOwner.id } });
      expect(result.data.usuarioId).toBe(otherOwner.id);
      expect(result.data.usuario).not.toHaveProperty('password');
    });

    it('delete de una mascota ajena responde 404 y no elimina', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.delete(mockMascota.id, otherOwner)).rejects.toThrow(NotFoundException);
      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockMascota.id, usuarioId: otherOwner.id },
      });
      expect(mockMascotaRepo.remove).not.toHaveBeenCalled();
    });

    it('el dueño puede eliminar su propia mascota', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(mockMascota);
      mockMascotaRepo.remove.mockResolvedValue(mockMascota);

      await service.delete(mockMascota.id, owner);

      expect(mockMascotaRepo.remove).toHaveBeenCalledWith(mockMascota);
    });
  });
});
