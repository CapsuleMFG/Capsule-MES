import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Button from '../ui/Button';
import { Upload, FileSpreadsheet, X, CheckCircle, AlertCircle } from 'lucide-react';
import type { WorkOrder } from '../../types';

interface BomImportProps {
    jobId: number;
    workOrders: WorkOrder[];
}

export default function BomImport({ jobId }: BomImportProps) {
    const queryClient = useQueryClient();
    const toast = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [importResult, setImportResult] = useState<{
        success: boolean;
        message: string;
        itemsImported?: number;
    } | null>(null);

    const importMutation = useMutation({
        mutationFn: (file: File) => engineeringService.importBom(jobId, file),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['bomItems', jobId] });
            setImportResult({
                success: true,
                message: data.message,
                itemsImported: data.itemsImported,
            });
            toast.success(`Successfully imported ${data.itemsImported} BOM items!`);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Failed to import BOM';
            setImportResult({ success: false, message });
            toast.error(message);
        },
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setImportResult(null);
        }
    };

    const handleClear = () => {
        setSelectedFile(null);
        setImportResult(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg border border-gray-800/60 bg-rivian-black/30 px-4 py-3">
                <FileSpreadsheet className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 flex-shrink-0">BOM</span>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="bom-file-input"
                />

                {selectedFile ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 py-1 px-3 bg-rivian-soft-black border border-gray-700 rounded text-sm flex-1 min-w-0">
                            <span className="text-white truncate">{selectedFile.name}</span>
                            <span className="text-xs text-gray-600 flex-shrink-0">
                                {(selectedFile.size / 1024).toFixed(0)} KB
                            </span>
                            <button onClick={handleClear} className="text-gray-500 hover:text-gray-300 flex-shrink-0 ml-auto">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <Button
                            variant="primary"
                            onClick={() => importMutation.mutate(selectedFile)}
                            disabled={importMutation.isPending}
                            className="!py-1.5 !px-4 !text-xs flex-shrink-0"
                        >
                            {importMutation.isPending ? 'Importing...' : 'Import'}
                        </Button>
                    </div>
                ) : (
                    <label htmlFor="bom-file-input" className="flex items-center gap-2 py-1 px-3 bg-rivian-soft-black border border-dashed border-gray-600 rounded text-sm text-gray-500 hover:border-gray-500 hover:text-gray-400 cursor-pointer transition-colors flex-1">
                        <Upload className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Choose CSV or Excel file</span>
                    </label>
                )}
            </div>

            {importResult && (
                <div className={`rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs ${
                    importResult.success
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-red-500/10 text-red-400'
                }`}>
                    {importResult.success
                        ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        : <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    }
                    {importResult.message}
                </div>
            )}
        </div>
    );
}
