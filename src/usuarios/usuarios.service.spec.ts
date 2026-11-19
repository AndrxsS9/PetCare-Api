import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcrypt';
import { UsuariosService } from './usuarios.service.js';
import { UsuarioEntity } from './usuario.entity.js';
import { RolUsuario } from './usuario.dto.js';

describe('UsuariosService', () => {
  let service: UsuariosService;
  let repo: Repository<UsuarioEntity>;

  const mockUsuario: UsuarioEntity = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    nombre: 'Edgar Test',
    email: 'edgar@petcare.com',
    password: '$2b$10$hashedPasswordSample1234567890',
    telefono: '3001112233',
    rol: RolUsuario.DUENO,
    estado: true,
    mascotas: [],
  };

  const mockRepo = {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsuariosService,
        {
          provide: getRepositoryToken(UsuarioEntity),
          useValue: mockRepo,
        },
      ],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
    repo = module.get<Repository<UsuarioEntity>>(getRepositoryToken(UsuarioEntity));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(repo).toBeDefined();
  });

  describe('findAll', () => {
    it('debe retornar la lista de usuarios excluyendo contraseñas', async () => {
      mockRepo.find.mockResolvedValue([mockUsuario]);

      const result = await service.findAll();

      expect(mockRepo.find).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0]).not.toHaveProperty('password');
      expect(result[0].email).toBe('edgar@petcare.com');
      expect(result[0].nombre).toBe('Edgar Test');
    });
  });

  describe('findById', () => {
    it('debe retornar el usuario encontrado sin la contraseña', async () => {
      mockRepo.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findById('a1b2c3d4-e5f6-7890-abcd-ef1234567890');

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        relations: { mascotas: true },
      });
      expect(result.message).toBe('Usuario encontrado');
      expect(result.data).not.toHaveProperty('password');
      expect(result.data.email).toBe('edgar@petcare.com');
    });

    it('debe lanzar NotFoundException si el usuario no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findById('non-existing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const createDto = {
      nombre: 'Nuevo Edgar',
      email: 'nuevo@petcare.com',
      password: 'password123',
      telefono: '3009998877',
      rol: RolUsuario.DUENO,
      estado: true,
    };

    it('debe crear un usuario con la contraseña hasheada y no devolverla en texto plano', async () => {
      mockRepo.findOne.mockResolvedValue(null); // No existe previo
      mockRepo.create.mockImplementation((dto) => dto as UsuarioEntity);
      mockRepo.save.mockImplementation((entity) =>
        Promise.resolve({
          ...entity,
          id: 'generated-uuid-1234',
        } as UsuarioEntity),
      );

      const result = await service.create(createDto);

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { email: createDto.email },
      });
      expect(mockRepo.create).toHaveBeenCalled();
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.message).toBe('Usuario creado con éxito');
      expect(result.data).not.toHaveProperty('password');
      expect(result.data.email).toBe(createDto.email);
    });

    it('debe lanzar ConflictException si el correo electrónico ya existe', async () => {
      mockRepo.findOne.mockResolvedValue(mockUsuario);

      await expect(
        service.create({
          ...createDto,
          email: 'edgar@petcare.com',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('debe actualizar los datos del usuario y devolverlo sin contraseña', async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockUsuario });
      mockRepo.save.mockImplementation((u) => Promise.resolve(u));

      const result = await service.update(mockUsuario.id, {
        nombre: 'Nombre Actualizado',
      });

      expect(result.message).toBe('Usuario actualizado con éxito');
      expect(result.data.nombre).toBe('Nombre Actualizado');
      expect(result.data).not.toHaveProperty('password');
    });

    it('debe lanzar NotFoundException si el usuario a actualizar no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update('inexistente', { nombre: 'Cualquiera' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe lanzar ConflictException si intenta cambiar a un correo ya utilizado', async () => {
      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockUsuario }) // find por id
        .mockResolvedValueOnce({ id: 'otro-uuid', email: 'ocupado@petcare.com' }); // find por email

      await expect(
        service.update(mockUsuario.id, { email: 'ocupado@petcare.com' }),
      ).rejects.toThrow(ConflictException);
    });

    it('debe hashear la contraseña si se solicita actualizarla', async () => {
      const userToUpdate = { ...mockUsuario };
      mockRepo.findOne.mockResolvedValue(userToUpdate);
      mockRepo.save.mockImplementation((u) => Promise.resolve(u));

      const hashSpy = vi.spyOn(bcrypt, 'hash');

      await service.update(mockUsuario.id, { password: 'newSecretPassword' });

      expect(hashSpy).toHaveBeenCalledWith('newSecretPassword', 10);
      expect(userToUpdate.password).not.toBe('newSecretPassword');
    });
  });

  describe('delete', () => {
    it('debe eliminar el usuario satisfactoriamente', async () => {
      mockRepo.findOne.mockResolvedValue(mockUsuario);
      mockRepo.remove.mockResolvedValue(mockUsuario);

      const result = await service.delete(mockUsuario.id);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: mockUsuario.id } });
      expect(mockRepo.remove).toHaveBeenCalledWith(mockUsuario);
      expect(result.message).toBe('Usuario eliminado con éxito');
    });

    it('debe lanzar NotFoundException si el usuario a eliminar no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.delete('inexistente')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByEmailForAuth', () => {
    it('debe retornar la entidad completa (con hash) para verificar credenciales', async () => {
      mockRepo.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findByEmailForAuth('edgar@petcare.com');

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'edgar@petcare.com' } });
      expect(result).toBe(mockUsuario);
    });

    it('debe retornar null si el correo no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findByEmailForAuth('nadie@petcare.com')).resolves.toBeNull();
    });
  });

  describe('findSafeById', () => {
    it('debe retornar el usuario sin la contraseña', async () => {
      mockRepo.findOne.mockResolvedValue(mockUsuario);

      const result = await service.findSafeById(mockUsuario.id);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: mockUsuario.id } });
      expect(result).not.toBeNull();
      expect(result).not.toHaveProperty('password');
      expect(result?.email).toBe('edgar@petcare.com');
    });

    it('debe retornar null si el usuario no existe', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findSafeById('no-existe')).resolves.toBeNull();
    });
  });
});
