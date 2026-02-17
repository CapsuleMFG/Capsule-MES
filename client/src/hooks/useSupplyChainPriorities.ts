import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as supplyChainService from '../services/supplychain.service';
import type { ScPriorityItem } from '../types';
import { jobsKeys } from './useJobs';

export const scPriorityKeys = {
    all: ['scPriorities'] as const,
};

export function useScPriorities() {
    return useQuery({
        queryKey: scPriorityKeys.all,
        queryFn: supplyChainService.getScPriorities,
    });
}

export function useUpdateScPriorities() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (priorities: ScPriorityItem[]) =>
            supplyChainService.updateScPriorities(priorities),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: scPriorityKeys.all });
            queryClient.invalidateQueries({ queryKey: jobsKeys.lists() });
            queryClient.invalidateQueries({ queryKey: ['pbomItems'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
        },
    });
}
