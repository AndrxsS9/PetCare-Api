import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MascotasService } from './mascotas.service.js';
import { MascotaEntity } from './mascota.entity.js';
import { UsuarioEntity } from '../usuarios/usuario.entity.js';
import { EspecieMascota, CreateMascotaDto } from './mascota.dto.js';
import { RolUsuario } from '../usuarios/usuario.dto.js';

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

      const result = await service.findAll();

      expect(mockMascotaRepo.find).toHaveBeenCalledWith({
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

      const result = await service.findById(mockMascota.id);

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

      await expect(service.findById('non-existent-id')).rejects.toThrow(NotFoundException);
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

      const result = await service.create(createDto);

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

      await expect(service.create(createDto)).rejects.toThrow(NotFoundException);
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
      });

      expect(result.message).toBe('Mascota actualizada con éxito');
      expect(result.data.nombre).toBe('Firulais Segundo');
      expect(result.data.peso).toBe(16.0);
    });

    it('debe lanzar NotFoundException si la mascota a actualizar no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { nombre: 'Nuevo Nombre' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar la transferencia si el nuevo usuario no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue({ ...mockMascota });
      mockUsuarioRepo.findOne.mockResolvedValue(null); // Nuevo usuario no existe

      await expect(
        service.update(mockMascota.id, { usuarioId: 'user-inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('debe eliminar la mascota satisfactoriamente', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(mockMascota);
      mockMascotaRepo.remove.mockResolvedValue(mockMascota);

      const result = await service.delete(mockMascota.id);

      expect(mockMascotaRepo.findOne).toHaveBeenCalledWith({ where: { id: mockMascota.id } });
      expect(mockMascotaRepo.remove).toHaveBeenCalledWith(mockMascota);
      expect(result.message).toBe('Mascota eliminada con éxito');
    });

    it('debe lanzar NotFoundException si la mascota a eliminar no existe', async () => {
      mockMascotaRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('inexistente')).rejects.toThrow(NotFoundException);
    });
  });
});
