import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { RolUsuario, CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { ROLES_KEY } from '../auth/decorators/roles.decorator.js';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: UsuariosService;

  const buildUser = (rol: RolUsuario, id = 'test-id'): AuthenticatedUser => ({
    id,
    nombre: 'Usuario Autenticado',
    email: `${rol.toLowerCase()}@petcare.com`,
    telefono: '3000000000',
    rol,
    estado: true,
    mascotas: [],
  });
  const admin = buildUser(RolUsuario.ADMIN, 'admin-id');

  const mockService = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [
        {
          provide: UsuariosService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
    service = module.get<UsuariosService>(UsuariosService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('getUsuarios debe llamar a service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const res = await controller.getUsuarios();
    expect(mockService.findAll).toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  it('getUsuarioById debe llamar a service.findById con el id proporcionado', async () => {
    const mockRes = { message: 'Usuario encontrado', data: {} as any };
    mockService.findById.mockResolvedValue(mockRes);

    const res = await controller.getUsuarioById('test-id', admin);
    expect(mockService.findById).toHaveBeenCalledWith('test-id');
    expect(res).toBe(mockRes);
  });

  it('createUsuario debe llamar a service.create con el payload', async () => {
    const payload: CreateUsuarioDto = {
      nombre: 'Test',
      email: 'test@correo.com',
      password: 'password123',
      telefono: '1234567890',
      rol: RolUsuario.DUENO,
    };
    mockService.create.mockResolvedValue({ message: 'Usuario creado con éxito', data: {} as any });

    await controller.createUsuario(payload);
    expect(mockService.create).toHaveBeenCalledWith(payload);
  });

  it('updateUsuario debe llamar a service.update con el id y changes', async () => {
    const changes: UpdateUsuarioDto = { nombre: 'Nombre Nuevo' };
    mockService.update.mockResolvedValue({ message: 'Usuario actualizado con éxito', data: {} as any });

    await controller.updateUsuario('test-id', changes, admin);
    expect(mockService.update).toHaveBeenCalledWith('test-id', changes);
  });

  it('deleteUsuario debe llamar a service.delete con el id', async () => {
    mockService.delete.mockResolvedValue({ message: 'Usuario eliminado con éxito' });

    const res = await controller.deleteUsuario('test-id');
    expect(mockService.delete).toHaveBeenCalledWith('test-id');
    expect(res.message).toBe('Usuario eliminado con éxito');
  });

  describe('autorización', () => {
    it('getUsuarios exige rol ADMIN o VETERINARIO', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UsuariosController.prototype.getUsuarios);
      expect(roles).toEqual([RolUsuario.ADMIN, RolUsuario.VETERINARIO]);
    });

    it('createUsuario exige rol ADMIN', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UsuariosController.prototype.createUsuario);
      expect(roles).toEqual([RolUsuario.ADMIN]);
    });

    it('deleteUsuario exige rol ADMIN', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, UsuariosController.prototype.deleteUsuario);
      expect(roles).toEqual([RolUsuario.ADMIN]);
    });

    it('getUsuarioById permite a un DUENO consultar su propio usuario', async () => {
      mockService.findById.mockResolvedValue({ message: 'Usuario encontrado', data: {} });
      await controller.getUsuarioById('test-id', buildUser(RolUsuario.DUENO, 'test-id'));
      expect(mockService.findById).toHaveBeenCalledWith('test-id');
    });

    it('getUsuarioById permite a un VETERINARIO consultar otros usuarios', async () => {
      mockService.findById.mockResolvedValue({ message: 'Usuario encontrado', data: {} });
      await controller.getUsuarioById('otro-id', buildUser(RolUsuario.VETERINARIO, 'vet-id'));
      expect(mockService.findById).toHaveBeenCalledWith('otro-id');
    });

    it('getUsuarioById lanza 403 si un DUENO consulta otro usuario', () => {
      expect(() =>
        controller.getUsuarioById('otro-id', buildUser(RolUsuario.DUENO, 'test-id')),
      ).toThrow(ForbiddenException);
      expect(mockService.findById).not.toHaveBeenCalled();
    });

    it('updateUsuario permite a un DUENO modificar sus propios datos básicos', async () => {
      mockService.update.mockResolvedValue({ message: 'Usuario actualizado con éxito', data: {} });
      const changes: UpdateUsuarioDto = { telefono: '3009998877' };
      await controller.updateUsuario('test-id', changes, buildUser(RolUsuario.DUENO, 'test-id'));
      expect(mockService.update).toHaveBeenCalledWith('test-id', changes);
    });

    it('updateUsuario lanza 403 si un DUENO intenta asignarse rol ADMIN', () => {
      expect(() =>
        controller.updateUsuario(
          'test-id',
          { rol: RolUsuario.ADMIN },
          buildUser(RolUsuario.DUENO, 'test-id'),
        ),
      ).toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('updateUsuario lanza 403 si un VETERINARIO intenta cambiar su rol', () => {
      expect(() =>
        controller.updateUsuario(
          'vet-id',
          { rol: RolUsuario.ADMIN },
          buildUser(RolUsuario.VETERINARIO, 'vet-id'),
        ),
      ).toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('updateUsuario lanza 403 si un usuario no ADMIN intenta cambiar su estado', () => {
      expect(() =>
        controller.updateUsuario('test-id', { estado: true }, buildUser(RolUsuario.DUENO, 'test-id')),
      ).toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('updateUsuario lanza 403 si un DUENO intenta modificar otro usuario', () => {
      expect(() =>
        controller.updateUsuario('otro-id', { nombre: 'X' }, buildUser(RolUsuario.DUENO, 'test-id')),
      ).toThrow(ForbiddenException);
      expect(mockService.update).not.toHaveBeenCalled();
    });

    it('updateUsuario permite a un ADMIN cambiar el rol de otro usuario', async () => {
      mockService.update.mockResolvedValue({ message: 'Usuario actualizado con éxito', data: {} });
      await controller.updateUsuario('otro-id', { rol: RolUsuario.VETERINARIO }, admin);
      expect(mockService.update).toHaveBeenCalledWith('otro-id', { rol: RolUsuario.VETERINARIO });
    });
  });
});
