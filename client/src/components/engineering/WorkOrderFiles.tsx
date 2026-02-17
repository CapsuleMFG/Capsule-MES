import { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as jobsService from '../../services/jobs.service';
import * as engineeringService from '../../services/engineering.service';
import Button from '../ui/Button';
import Select from '../ui/Select';
import { Upload, FileText, X } from 'lucide-react';
import type { WorkOrder } from '../../types';

interface WorkOrderFilesProps {
    jobId: number;
    workOrders?: WorkOrder[];
}

export default function WorkOrderFiles({ jobId }: WorkOrderFilesProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [machine, setMachine] = useState('');
    const [description, setDescription] = useState('');
    const [isRecut, setIsRecut] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const { data: machines = [], isLoading: machinesLoading } = useQuery({
        queryKey: ['machines'],
        queryFn: () => engineeringService.getMachines(true),
    });

    const createWoMutation = useMutation({
        mutationFn: async (data: { machine: string; description: string; file: File; isRecut: boolean }) => {
            const newWo = await jobsService.createWorkOrder(jobId, {
                description: data.description || `${data.machine} Work Order`,
                createdBy: 'Engineer',
                notes: `Machine: ${data.machine}`,
                isRecut: data.isRecut,
            });
            await engineeringService.uploadWorkOrderFile(jobId, newWo.id, data.file);
            return newWo;
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['workOrders', jobId] });
            toast.success(`Work Order ${data.woNumber} created for ${machine}!`);
            setMachine('');
            setDescription('');
            setIsRecut(false);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create work order');
        },
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                toast.error('Please upload a PDF file');
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleClearFile = () => {
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSubmit = () => {
        if (!machine) {
            toast.error('Please select a machine');
            return;
        }
        if (!selectedFile) {
            toast.error('Please select a PDF file');
            return;
        }
        createWoMutation.mutate({
            machine,
            description,
            file: selectedFile,
            isRecut,
        });
    };

    return (
        <div className="rounded-lg border border-gray-800/60 bg-rivian-black/30 p-4 space-y-3">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">New Work Order</h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Machine */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Machine *</label>
                    <Select
                        value={machine}
                        onChange={(e) => setMachine(e.target.value)}
                        options={[
                            { value: '', label: machinesLoading ? 'Loading...' : 'Select machine' },
                            ...machines.map(m => ({ value: m.name, label: m.name }))
                        ]}
                        disabled={createWoMutation.isPending || machinesLoading}
                        className="!py-1.5 !text-sm"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                        type="text"
                        placeholder="Optional description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={createWoMutation.isPending}
                        className="w-full py-1.5 px-3 text-sm bg-rivian-soft-black border border-gray-700 rounded text-white placeholder:text-gray-600"
                    />
                </div>

                {/* PDF Upload */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">PDF File *</label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="wo-pdf-input"
                        disabled={createWoMutation.isPending}
                    />
                    {selectedFile ? (
                        <div className="flex items-center gap-2 py-1.5 px-3 bg-rivian-soft-black border border-gray-700 rounded text-sm">
                            <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                            <span className="text-white truncate flex-1">{selectedFile.name}</span>
                            <button
                                onClick={handleClearFile}
                                className="text-gray-500 hover:text-gray-300 flex-shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ) : (
                        <label htmlFor="wo-pdf-input" className="flex items-center gap-2 py-1.5 px-3 bg-rivian-soft-black border border-dashed border-gray-600 rounded text-sm text-gray-500 hover:border-gray-500 hover:text-gray-400 cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                            <span>Choose PDF file</span>
                        </label>
                    )}
                </div>
            </div>

            {/* Bottom row: recut + submit */}
            <div className="flex items-center justify-between gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={isRecut}
                        onChange={(e) => setIsRecut(e.target.checked)}
                        disabled={createWoMutation.isPending}
                        className="rounded border-gray-600 w-3.5 h-3.5"
                    />
                    Recut work order
                    {isRecut && (
                        <span className="px-1.5 py-px rounded text-[10px] font-medium bg-orange-500/15 text-orange-400">
                            Recut
                        </span>
                    )}
                </label>

                <Button
                    variant="primary"
                    onClick={handleSubmit}
                    disabled={createWoMutation.isPending || !machine || !selectedFile}
                    className="!py-1.5 !px-4 !text-xs"
                >
                    {createWoMutation.isPending ? 'Creating...' : 'Create Work Order'}
                </Button>
            </div>

            {isRecut && (
                <p className="text-xs text-orange-400/80">
                    Scrapped parts will be cross-referenced when parsing the PDF.
                </p>
            )}
        </div>
    );
}
