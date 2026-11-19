import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UsuariosController } from './usuarios.controller.js';
import { UsuariosService } from './usuarios.service.js';
import { RolUsuario, CreateUsuarioDto, UpdateUsuarioDto } from './usuario.dto.js';

describe('UsuariosController', () => {
  let controller: UsuariosController;
  let service: UsuariosService;

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

    const res = await controller.getUsuarioById('test-id');
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

    await controller.updateUsuario('test-id', changes);
    expect(mockService.update).toHaveBeenCalledWith('test-id', changes);
  });

  it('deleteUsuario debe llamar a service.delete con el id', async () => {
    mockService.delete.mockResolvedValue({ message: 'Usuario eliminado con éxito' });

    const res = await controller.deleteUsuario('test-id');
    expect(mockService.delete).toHaveBeenCalledWith('test-id');
    expect(res.message).toBe('Usuario eliminado con éxito');
  });
});
