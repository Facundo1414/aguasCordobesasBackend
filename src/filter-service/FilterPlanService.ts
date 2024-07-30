import { Injectable } from '@nestjs/common';

@Injectable()
export class FilterPlanService {
  async filterPlans(data: any[]): Promise<{ pa01Plans: any[], otherPlans: any[], removedPlans: any[] }> {
    const pa01Plans = [];
    const otherPlans = [];
    const removedPlans = [];

    for (const row of data) {
      // Verificar la cantidad de cuotas vencidas en la columna 5 (índice 4)
      const cuotasVencidas = row[5];

      if (cuotasVencidas >= 4) {
        // Si la cantidad de cuotas vencidas es igual o mayor a 4, agregar la fila a removedPlans
        removedPlans.push(row);
      } else if (row[4] === 'PA01') {
        // Filtrar los planes "PA01"
        pa01Plans.push(row);
      } else if (row[4] === 'PCB1' || row[4] === 'ATC2') {
        // Filtrar los planes "PCB1" y "ATC2"
        otherPlans.push(row);
      }
    }

    return { pa01Plans, otherPlans, removedPlans };
  }
}
