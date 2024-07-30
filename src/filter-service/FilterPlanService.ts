import { Injectable } from '@nestjs/common';

@Injectable()
export class FilterPlanService {
  // Aquí agregarás la lógica para el segundo filtro
  async filterPlans(data: any[]): Promise<any[]> {
    // Lógica para procesar los datos y aplicar el filtro de plan
    // Esta función debe devolver los datos filtrados
    return data; // Placeholder, implementar lógica real
  }
}
