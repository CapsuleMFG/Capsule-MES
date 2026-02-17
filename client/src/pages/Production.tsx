import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import { Factory, Package, Clock, Briefcase, ScanLine, GitBranch, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useJobs } from '../hooks/useJobs';
import { useTrackedParts } from '../hooks/usePartsTracking';
import * as productionService from '../services/production.service';
import ProductionProjects from '../components/production/ProductionProjects';
import PartsTracking from './PartsTracking';
import RouteTemplates from './RouteTemplates';
import type { WorkOrder, ProductionStatus, Machine } from '../types';

type ProductionTab = 'projects' | 'scheduling' | 'parts' | 'routes';

export default function Production() {
  const [activeTab, setActiveTab] = useState<ProductionTab>('projects');
  const [schedulingView, setSchedulingView] = useState<'pool' | 'overview'>('pool');
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch production pool
  const { data: workOrders, isLoading, error } = useQuery({
    queryKey: ['productionPool'],
    queryFn: productionService.getProductionPool,
  });

  // Fetch machines
  const { data: machines } = useQuery({
    queryKey: ['machines'],
    queryFn: productionService.getMachines,
  });

  // Fetch jobs for metrics
  const { data: allJobs } = useJobs();

  // Fetch all parts for metrics
  const { data: allParts } = useTrackedParts({});

  // Count production jobs
  const productionJobCount = allJobs?.filter((job) => {
    const stage = job.workflowProgress?.find((p) => p.stageName === 'Production');
    return stage && (stage.status === 'In Progress' || stage.status === 'Not Started');
  }).length || 0;

  // Group work orders by machine type for pool view
  const workOrdersByMachineType = workOrders?.reduce((acc, wo) => {
    const type = wo.machineType || 'Unassigned';
    if (!acc[type]) acc[type] = [];
    acc[type].push(wo);
    return acc;
  }, {} as Record<string, any[]>) || {};

  // Get unassigned work orders (In Pool)
  const unassignedWorkOrders = workOrders?.filter(wo => wo.productionStatus === 'In Pool') || [];

  // Calculate metrics
  const totalWOs = workOrders?.length || 0;
  const inPoolWOs = unassignedWorkOrders.length;
  const activeParts = allParts?.filter(p => p.status === 'In Progress').length || 0;
  const completedParts = allParts?.filter(p => p.status === 'Completed').length || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-red-500 p-8">
        Error loading production data. Please try again.
      </div>
    );
  }

  const tabs: { key: ProductionTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { key: 'projects', label: 'Projects', icon: <Briefcase className="w-4 h-4" />, badge: productionJobCount },
    { key: 'scheduling', label: 'Scheduling', icon: <Factory className="w-4 h-4" />, badge: inPoolWOs },
    { key: 'parts', label: 'Parts Tracking', icon: <ScanLine className="w-4 h-4" /> },
    { key: 'routes', label: 'Route Templates', icon: <GitBranch className="w-4 h-4" /> },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Production Management</h1>
        <p className="text-gray-400 mt-2">
          Manage projects, scheduling, parts tracking, and route templates
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Briefcase className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Jobs in Production</p>
              <p className="text-2xl font-bold text-white">{productionJobCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Package className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Work Orders</p>
              <p className="text-2xl font-bold text-white">{totalWOs}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <ScanLine className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Parts</p>
              <p className="text-2xl font-bold text-white">{activeParts}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Completed Parts</p>
              <p className="text-2xl font-bold text-white">{completedParts}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-gray-700 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
              activeTab === tab.key
                ? 'border-rivian-accent text-white bg-rivian-hover'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-rivian-hover'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-rivian-accent/20 text-rivian-accent">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'projects' && (
        <ProductionProjects />
      )}

      {activeTab === 'scheduling' && (
        <Card className="p-0 overflow-hidden">
          {/* Sub-toggle: Pool vs Machines Overview */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setSchedulingView('pool')}
              className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
                schedulingView === 'pool'
                  ? 'border-rivian-accent text-white bg-rivian-hover'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-rivian-hover'
              }`}
            >
              <Package className="w-4 h-4" />
              Pool ({inPoolWOs})
            </button>

            <button
              onClick={() => setSchedulingView('overview')}
              className={`px-6 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 flex items-center gap-2 ${
                schedulingView === 'overview'
                  ? 'border-rivian-accent text-white bg-rivian-hover'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-rivian-hover'
              }`}
            >
              <Factory className="w-4 h-4" />
              Machines Overview
            </button>
          </div>

          <div className="p-6">
            {schedulingView === 'pool' ? (
              <PoolView
                workOrdersByMachineType={workOrdersByMachineType}
                machines={machines || []}
              />
            ) : (
              <MachinesOverview
                machines={machines || []}
                workOrders={workOrders || []}
              />
            )}
          </div>
        </Card>
      )}

      {activeTab === 'parts' && (
        <PartsTracking />
      )}

      {activeTab === 'routes' && (
        <RouteTemplates />
      )}
    </div>
  );
}

// Pool View Component
interface PoolViewProps {
  workOrdersByMachineType: Record<string, any[]>;
  machines: Machine[];
}

function PoolView({ workOrdersByMachineType, machines }: PoolViewProps) {
  const queryClient = useQueryClient();
  const toast = useToast();

  const assignMutation = useMutation({
    mutationFn: ({ woId, machineId }: { woId: number; machineId: number }) =>
      productionService.assignToMachine(woId, machineId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPool'] });
      toast.success('Work order assigned to machine');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to assign work order');
    },
  });

  const updatePriorityMutation = useMutation({
    mutationFn: ({ woId, priority }: { woId: number; priority: any }) =>
      productionService.updateProductionPriority(woId, priority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productionPool'] });
      toast.success('Production priority updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update priority');
    },
  });

  const handleAssign = (woId: number, machineId: number) => {
    assignMutation.mutate({ woId, machineId });
  };

  const handlePriorityChange = (woId: number, priority: any) => {
    updatePriorityMutation.mutate({ woId, priority });
  };

  if (Object.keys(workOrdersByMachineType).length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-lg">No work orders in pool</p>
        <p className="text-gray-500 text-sm mt-2">
          Work orders will appear here after being sent from Engineering
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(workOrdersByMachineType).map(([machineType, wos]) => {
        const machinesOfType = machines.filter(m => m.type === machineType);
        return (
          <div key={machineType}>
            <div className="flex items-center gap-2 mb-3">
              <Factory className="w-5 h-5 text-rivian-accent" />
              <h3 className="text-lg font-semibold text-white">{machineType}</h3>
              <span className="text-sm text-gray-400">({wos.length} WO{wos.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="space-y-2">
              {wos.map((wo) => (
                <div
                  key={wo.id}
                  className="p-4 rounded-lg bg-rivian-hover border border-gray-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <p className="font-semibold text-white">{wo.woNumber}</p>
                        {/* Production Priority Badge (if set) */}
                        {wo.productionPriority && (
                          <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                            wo.productionPriority === 'Critical'
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : wo.productionPriority === 'High'
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                              : wo.productionPriority === 'Medium'
                              ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                              : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                          }`}>
                            Prod: {wo.productionPriority}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mb-1">
                        Job: <span className="text-white font-medium">{wo.jobNumber}</span>
                        {' • '}
                        Client: <span className="text-white">{wo.clientName}</span>
                      </p>
                      {wo.description && (
                        <p className="text-sm text-gray-400 mb-3">{wo.description}</p>
                      )}
                      {/* Production Priority Control */}
                      <div className="flex items-center gap-2 mt-2">
                        <label className="text-xs text-gray-400">Prod Priority:</label>
                        <Select
                          value={wo.productionPriority || ''}
                          onChange={(e) => handlePriorityChange(wo.id, e.target.value)}
                          options={[
                            { value: '', label: 'Not set' },
                            { value: 'Critical', label: 'Critical' },
                            { value: 'High', label: 'High' },
                            { value: 'Medium', label: 'Medium' },
                            { value: 'Low', label: 'Low' },
                          ]}
                          className="text-sm min-w-[130px]"
                          disabled={updatePriorityMutation.isPending}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-400 whitespace-nowrap">Assign to:</label>
                      <Select
                        value=""
                        onChange={(e) => {
                          const machineId = parseInt(e.target.value);
                          if (machineId) handleAssign(wo.id, machineId);
                        }}
                        options={[
                          { value: '', label: 'Select machine...' },
                          ...machinesOfType.map((m) => ({
                            value: m.id.toString(),
                            label: m.name,
                          })),
                        ]}
                        className="text-sm min-w-[180px]"
                        disabled={assignMutation.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Machines Overview Component
interface MachinesOverviewProps {
  machines: Machine[];
  workOrders: any[];
}

function MachinesOverview({ machines, workOrders }: MachinesOverviewProps) {
  const [expandedMachine, setExpandedMachine] = React.useState<number | null>(null);

  const getWorkOrdersForMachine = (machineId: number) => {
    const priorityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return workOrders
      .filter(wo => wo.assignedMachineId === machineId)
      .sort((a, b) => {
        const aPriority = priorityOrder[a.productionPriority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.productionPriority as keyof typeof priorityOrder] ?? 4;
        return aPriority - bPriority;
      });
  };

  const getInProgressCount = (machineId: number) => {
    return workOrders.filter(
      wo => wo.assignedMachineId === machineId && wo.productionStatus === 'In Progress'
    ).length;
  };

  const getQueuedCount = (machineId: number) => {
    return workOrders.filter(
      wo => wo.assignedMachineId === machineId && wo.productionStatus === 'Assigned'
    ).length;
  };

  const getCompletedCount = (machineId: number) => {
    return workOrders.filter(
      wo => wo.assignedMachineId === machineId && wo.productionStatus === 'Completed'
    ).length;
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">All Machines Overview</h3>
        <p className="text-sm text-gray-400">
          Detailed view of all machines and their work orders - expand to see full details
        </p>
      </div>

      <div className="space-y-4">
        {machines.map((machine) => {
          const machineWOs = getWorkOrdersForMachine(machine.id);
          const inProgress = getInProgressCount(machine.id);
          const queued = getQueuedCount(machine.id);
          const completed = getCompletedCount(machine.id);
          const isExpanded = expandedMachine === machine.id;

          return (
            <Card key={machine.id} className="p-0 overflow-hidden">
              {/* Machine Header - Clickable */}
              <div
                className="p-5 cursor-pointer hover:bg-rivian-hover transition-colors"
                onClick={() => setExpandedMachine(isExpanded ? null : machine.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Factory className="w-6 h-6 text-rivian-accent flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-white mb-1">{machine.name}</h4>
                      <p className="text-sm text-gray-400">{machine.type}</p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mr-4">
                    <div className="text-center">
                      <div className={`text-lg font-bold ${inProgress > 0 ? 'text-blue-400' : 'text-gray-500'}`}>
                        {inProgress}
                      </div>
                      <div className="text-xs text-gray-500">In Progress</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${queued > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                        {queued}
                      </div>
                      <div className="text-xs text-gray-500">Queued</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${completed > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {completed}
                      </div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="text-center border-l border-gray-700 pl-4">
                      <div className="text-lg font-bold text-white">{machineWOs.length}</div>
                      <div className="text-xs text-gray-500">Total</div>
                    </div>
                  </div>

                  {/* Expand Icon */}
                  <div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content - Work Orders List */}
              {isExpanded && (
                <div className="border-t border-gray-800 bg-rivian-black p-5">
                  {machineWOs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No work orders assigned to this machine
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-medium text-gray-300">
                          Work Orders (sorted by priority)
                        </h5>
                      </div>

                      {machineWOs.map((wo) => (
                        <div
                          key={wo.id}
                          className="p-4 rounded-lg bg-rivian-hover border border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              {/* WO Header */}
                              <div className="flex items-center gap-3 mb-2">
                                <span className="font-semibold text-white">{wo.woNumber}</span>

                                {/* Production Priority */}
                                {wo.productionPriority && (
                                  <span className={`px-2 py-1 rounded-md text-xs font-medium border ${
                                    wo.productionPriority === 'Critical'
                                      ? 'bg-red-500/20 text-red-400 border-red-500/30'
                                      : wo.productionPriority === 'High'
                                      ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                                      : wo.productionPriority === 'Medium'
                                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                      : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                                  }`}>
                                    {wo.productionPriority}
                                  </span>
                                )}

                                {/* Status */}
                                <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                                  wo.productionStatus === 'Completed'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                    : wo.productionStatus === 'In Progress'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                    : wo.productionStatus === 'Discarded'
                                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                    : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                                }`}>
                                  {wo.productionStatus === 'Assigned' ? 'Queued' : wo.productionStatus}
                                </span>
                              </div>

                              {/* Job Info */}
                              <div className="text-sm text-gray-400 space-y-1">
                                <p>
                                  <span className="text-gray-500">Job:</span>{' '}
                                  <span className="text-white font-medium">{wo.jobNumber}</span>
                                  {' • '}
                                  <span className="text-gray-500">Client:</span>{' '}
                                  <span className="text-white">{wo.clientName}</span>
                                </p>
                                {wo.description && (
                                  <p className="text-gray-300">{wo.description}</p>
                                )}
                                {wo.assignedAt && (
                                  <p className="text-xs text-gray-500">
                                    Assigned: {new Date(wo.assignedAt).toLocaleString()}
                                  </p>
                                )}
                                {wo.productionStartedAt && (
                                  <p className="text-xs text-gray-500">
                                    Started: {new Date(wo.productionStartedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
