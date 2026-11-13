import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { PieceStock, MouvementStock } from '../models/stock.model';
import { PaginatedResponse } from '../models/vehicule.model';

@Injectable({ providedIn: 'root' })
export class StocksService {
  constructor(private api: ApiService) {}

  getPieces(page = 1, limit = 20) {
    return this.api.get<PaginatedResponse<PieceStock>>('/stocks/pieces', { page, limit });
  }

  getPiecesEnAlerte() {
    return this.api.get<PieceStock[]>('/stocks/pieces/alertes');
  }

  getOne(id: number) {
    return this.api.get<PieceStock>(`/stocks/pieces/${id}`);
  }

  createPiece(data: Partial<PieceStock>) {
    return this.api.post<PieceStock>('/stocks/pieces', data);
  }

  updatePiece(id: number, data: Partial<PieceStock>) {
    return this.api.patch<PieceStock>(`/stocks/pieces/${id}`, data);
  }

  deletePiece(id: number) {
    return this.api.delete<void>(`/stocks/pieces/${id}`);
  }

  getMouvements(pieceId: number) {
    return this.api.get<MouvementStock[]>(`/stocks/pieces/${pieceId}/mouvements`);
  }

  enregistrerMouvement(data: { pieceId: number; typeMouvement: string; quantite: number; motif?: string }) {
    return this.api.post<MouvementStock>('/stocks/mouvements', data);
  }
}
