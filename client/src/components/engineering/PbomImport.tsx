import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../../contexts/ToastContext';
import * as engineeringService from '../../services/engineering.service';
import Button from '../ui/Button';
import { UploadSimple, FileXls, X, CheckCircle, WarningCircle } from '@phosphor-icons/react';

interface PbomImportProps {
    jobId: number;
}

export default function PbomImport({ jobId }: PbomImportProps) {
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
        mutationFn: (file: File) => engineeringService.importPbom(jobId, file),
        onSuccess: async (data) => {
            // Force immediate refetch to show auto-linked inventory data
            await queryClient.refetchQueries({ queryKey: ['pbomItems', jobId] });
            setImportResult({
                success: true,
                message: data.message,
                itemsImported: data.itemsImported,
            });
            toast.success(`Successfully imported ${data.itemsImported} PBOM items!`);
            setSelectedFile(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        },
        onError: (error: any) => {
            const message = error.response?.data?.error || 'Failed to import PBOM';
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
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3">
                <FileXls size={16} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-400 flex-shrink-0">PBOM</span>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="pbom-file-input"
                />

                {selectedFile ? (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 py-1 px-3 bg-white border border-gray-100 rounded text-sm flex-1 min-w-0">
                            <span className="text-gray-900 truncate">{selectedFile.name}</span>
                            <span className="text-xs text-gray-400 flex-shrink-0">
                                {(selectedFile.size / 1024).toFixed(0)} KB
                            </span>
                            <button onClick={handleClear} className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-auto">
                                <X size={14} />
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
                    <label htmlFor="pbom-file-input" className="flex items-center gap-2 py-1 px-3 bg-white border border-dashed border-gray-200 rounded text-sm text-gray-400 hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-colors flex-1">
                        <UploadSimple size={14} className="flex-shrink-0" />
                        <span>Choose CSV or Excel file</span>
                    </label>
                )}
            </div>

            {importResult && (
                <div className={`rounded-lg px-4 py-2.5 flex items-center gap-2.5 text-xs ${
                    importResult.success
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                    {importResult.success
                        ? <CheckCircle size={14} className="flex-shrink-0" />
                        : <WarningCircle size={14} className="flex-shrink-0" />
                    }
                    {importResult.message}
                </div>
            )}
        </div>
    );
}
