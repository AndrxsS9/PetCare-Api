import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MascotasController } from './mascotas.controller.js';
import { MascotasService } from './mascotas.service.js';
import { EspecieMascota, CreateMascotaDto, UpdateMascotaDto } from './mascota.dto.js';

describe('MascotasController', () => {
  let controller: MascotasController;
  let service: MascotasService;

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
      controllers: [MascotasController],
      providers: [
        {
          provide: MascotasService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<MascotasController>(MascotasController);
    service = module.get<MascotasService>(MascotasService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  it('getMascotas debe llamar a service.findAll', async () => {
    mockService.findAll.mockResolvedValue([]);
    const res = await controller.getMascotas();
    expect(mockService.findAll).toHaveBeenCalled();
    expect(res).toEqual([]);
  });

  it('getMascotaById debe llamar a service.findById con el id proporcionado', async () => {
    const mockRes = { message: 'Mascota encontrada', data: {} as any };
    mockService.findById.mockResolvedValue(mockRes);

    const res = await controller.getMascotaById('pet-123');
    expect(mockService.findById).toHaveBeenCalledWith('pet-123');
    expect(res).toBe(mockRes);
  });

  it('createMascota debe llamar a service.create con el payload', async () => {
    const payload: CreateMascotaDto = {
      usuarioId: 'user-uuid',
      nombre: 'Firulais',
      especie: EspecieMascota.PERRO,
      raza: 'Labrador',
      fecha_nacimiento: new Date('2021-01-01'),
      peso: 25.0,
    };
    mockService.create.mockResolvedValue({ message: 'Mascota creada con éxito', data: {} as any });

    await controller.createMascota(payload);
    expect(mockService.create).toHaveBeenCalledWith(payload);
  });

  it('updateMascota debe llamar a service.update con el id y changes', async () => {
    const changes: UpdateMascotaDto = { nombre: 'Nuevo Firulais' };
    mockService.update.mockResolvedValue({ message: 'Mascota actualizada con éxito', data: {} as any });

    await controller.updateMascota('pet-123', changes);
    expect(mockService.update).toHaveBeenCalledWith('pet-123', changes);
  });

  it('deleteMascota debe llamar a service.delete con el id', async () => {
    mockService.delete.mockResolvedValue({ message: 'Mascota eliminada con éxito' });

    const res = await controller.deleteMascota('pet-123');
    expect(mockService.delete).toHaveBeenCalledWith('pet-123');
    expect(res.message).toBe('Mascota eliminada con éxito');
  });
});
