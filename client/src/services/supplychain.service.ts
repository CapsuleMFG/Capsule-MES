import api from './api';
import type { ScPriorityItem, UpdateScPrioritiesResponse } from '../types';

export async function getScPriorities(): Promise<ScPriorityItem[]> {
    const response = await api.get('/supply-chain/priorities');
    return response.data;
}

export async function updateScPriorities(priorities: ScPriorityItem[]): Promise<UpdateScPrioritiesResponse> {
    const response = await api.put('/supply-chain/priorities', { priorities });
    return response.data;
}
